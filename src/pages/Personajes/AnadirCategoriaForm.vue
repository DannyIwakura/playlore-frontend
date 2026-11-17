<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import ModalAviso from '../../components/ModalAviso.vue'
import ModalFormulario from '../../components/ModalFormulario.vue'

interface CategoriaDTO {
  idCategoria: number
  nombre: string
}

interface RelacionDTO {
  idRelacion: number
  idCategoria: number
  nombre: string
}

const props = defineProps<{
  idPersonaje: number
  nombrePersonaje?: string
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const todas = ref<CategoriaDTO[]>([])
const actuales = ref<RelacionDTO[]>([])
const seleccionada = ref('')
const aviso = ref<string | null>(null)

const cargando = ref(true)
const errorCarga = ref(false)
const guardando = ref(false)
const quitando = ref<number | null>(null)

const disponibles = computed(() =>
  todas.value.filter(
    (cat) => !actuales.value.some((actual) => actual.idCategoria === cat.idCategoria)
  )
)

const sinDisponibles = computed(() => !cargando.value && disponibles.value.length === 0)

async function cargar() {
  cargando.value = true
  errorCarga.value = false

  try {
    const [resGlobal, resRelacion] = await Promise.all([
      api.get('/categorias', { params: { page: 0, size: 100 } }),
      api.get(`/personaje-categorias/personaje/${props.idPersonaje}`),
    ])

    todas.value = resGlobal.data.content ?? []

    // Guardamos el id de la tabla intermedia: es el que permite borrar la relacion.
    actuales.value = (resRelacion.data ?? []).map((pc: any) => ({
      idRelacion: pc.id,
      idCategoria: pc.idCategoria,
      nombre: pc.nombreCategoria,
    }))
  } catch {
    errorCarga.value = true
  } finally {
    cargando.value = false
  }
}

async function asignar() {
  const idCategoria = Number.parseInt(seleccionada.value, 10)
  if (!Number.isFinite(idCategoria) || guardando.value) return

  guardando.value = true
  try {
    const { data } = await api.post('/personaje-categorias', {
      idPersonaje: props.idPersonaje,
      idCategoria,
    })

    actuales.value.push({
      idRelacion: data.id,
      idCategoria: data.idCategoria,
      nombre: data.nombreCategoria,
    })
    seleccionada.value = ''
    emit('success')
  } catch {
    aviso.value = 'No se pudo asignar la categoría. Inténtalo de nuevo.'
  } finally {
    guardando.value = false
  }
}

async function quitar(relacion: RelacionDTO) {
  if (quitando.value !== null) return

  quitando.value = relacion.idRelacion
  try {
    await api.delete(`/personaje-categorias/${relacion.idRelacion}`)
    actuales.value = actuales.value.filter((cat) => cat.idRelacion !== relacion.idRelacion)
    emit('success')
  } catch {
    aviso.value = 'No se pudo quitar la categoría. Inténtalo de nuevo.'
  } finally {
    quitando.value = null
  }
}

onMounted(cargar)
</script>

<template>
  <ModalFormulario titulo="Gestionar categorías" @cerrar="emit('close')">
    <p v-if="nombrePersonaje" class="categorias-contexto">
      Categorías de <strong>{{ nombrePersonaje }}</strong>
    </p>

    <p v-if="cargando" class="categorias-estado" role="status">
      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      Cargando categorías…
    </p>

    <div v-else-if="errorCarga" class="pl-alert pl-alert--danger" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span class="flex-grow-1">No pudimos cargar las categorías.</span>
      <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="cargar()">
        Reintentar
      </button>
    </div>

    <template v-else>
      <section class="categorias-seccion" aria-labelledby="categorias-asignadas">
        <h3 id="categorias-asignadas" class="categorias-seccion__titulo">
          Asignadas
          <span v-if="actuales.length" class="categorias-cuenta">{{ actuales.length }}</span>
        </h3>

        <ul v-if="actuales.length" class="categorias-chips">
          <li v-for="cat in actuales" :key="cat.idRelacion" class="categorias-chip">
            <span class="categorias-chip__nombre">{{ cat.nombre }}</span>
            <button
              type="button"
              class="categorias-chip__quitar"
              :disabled="quitando === cat.idRelacion"
              :aria-label="`Quitar categoría ${cat.nombre}`"
              @click="quitar(cat)"
            >
              <span v-if="quitando === cat.idRelacion" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <i v-else class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <p v-else class="categorias-vacio">Sin categorías asignadas.</p>
      </section>

      <form class="categorias-form" novalidate @submit.prevent="asignar">
        <div class="pl-field">
          <label class="form-label" for="categoria-nueva">Añadir categoría</label>
          <select
            id="categoria-nueva"
            v-model="seleccionada"
            class="form-select"
            :disabled="guardando || sinDisponibles"
            aria-describedby="categoria-nueva-ayuda"
          >
            <option value="" disabled>Selecciona una categoría…</option>
            <option v-for="cat in disponibles" :key="cat.idCategoria" :value="cat.idCategoria">
              {{ cat.nombre }}
            </option>
          </select>
          <p id="categoria-nueva-ayuda" class="pl-field__hint">
            <template v-if="sinDisponibles">Este personaje ya tiene todas las categorías disponibles.</template>
            <template v-else>Se asignará al personaje y aparecerá en su perfil.</template>
          </p>
        </div>

        <div class="categorias-form__acciones">
          <button type="button" class="pl-btn pl-btn--secondary" @click="emit('close')">Cerrar</button>
          <button
            type="submit"
            class="pl-btn pl-btn--primary"
            :disabled="!seleccionada || guardando || sinDisponibles"
          >
            <span v-if="guardando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-plus-lg" aria-hidden="true"></i>
            {{ guardando ? 'Asignando…' : 'Asignar categoría' }}
          </button>
        </div>
      </form>
    </template>
  </ModalFormulario>

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.categorias-contexto {
  margin: 0 0 1rem;
  color: var(--pl-muted);
  font-size: 0.88rem;
}

.categorias-contexto strong {
  color: var(--pl-ink);
}

.categorias-estado {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 1.5rem 0;
  color: var(--pl-muted);
  font-size: 0.9rem;
}

.categorias-seccion__titulo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.6rem;
  color: var(--pl-ink);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.categorias-cuenta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 0.35rem;
  border-radius: 999px;
  color: var(--pl-primary-ink);
  background: rgba(var(--pl-primary-rgb), 0.12);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
}

.categorias-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.categorias-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  padding: 0.3rem 0.3rem 0.3rem 0.7rem;
  border: 1px solid rgba(var(--pl-primary-rgb), 0.2);
  border-radius: 999px;
  background: rgba(var(--pl-primary-rgb), 0.08);
  color: var(--pl-primary-ink);
  font-size: 0.85rem;
  font-weight: 700;
}

.categorias-chip__nombre {
  min-width: 0;
  overflow-wrap: anywhere;
}

.categorias-chip__quitar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--pl-primary-ink);
  background: transparent;
  font-size: 0.72rem;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard);
}

.categorias-chip__quitar:hover:not(:disabled) {
  color: #fff;
  background: var(--pl-danger);
}

.categorias-chip__quitar:disabled {
  opacity: 0.6;
}

.categorias-vacio {
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px dashed var(--pl-border);
  border-radius: var(--pl-radius-md);
  color: var(--pl-muted);
  font-size: 0.88rem;
}

.categorias-form {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--pl-border);
}

.categorias-form__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 575.98px) {
  .categorias-form__acciones {
    flex-direction: column-reverse;
  }

  .categorias-form__acciones .pl-btn {
    width: 100%;
  }
}
</style>

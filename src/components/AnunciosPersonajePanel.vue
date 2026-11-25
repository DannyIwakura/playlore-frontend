<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import ModalAviso from './ModalAviso.vue'
import ModalConfirmacion from './ModalConfirmacion.vue'
import ModalFormulario from './ModalFormulario.vue'
import RichTextEditor from './RichTextEditor.vue'
import TarjetaAnuncio from './TarjetaAnuncio.vue'
import { anunciosApi } from '../services/anunciosApi'
import { MAX_ANUNCIOS_ACTIVOS, type AnuncioDTO } from '../pages/Anuncios/anuncios'
import { useGestionAnuncios } from '../pages/Anuncios/useGestionAnuncios'

const props = withDefaults(
  defineProps<{
    personajeId: number
    esPropietario?: boolean
  }>(),
  { esPropietario: true },
)

// IDs únicos: el panel puede vivir en el perfil o en el formulario de edición.
const uid = useId()
const editorId = `${uid}-editor`
const categoriasHintId = `${uid}-categorias-hint`
const categoriaId = (id: number) => `${uid}-categoria-${id}`

const todosMisAnuncios = ref<AnuncioDTO[]>([])
const anunciosVisitante = ref<AnuncioDTO[]>([])
const cargandoAnuncios = ref(false)
const errorAnuncios = ref<string | null>(null)

const anunciosVisibles = computed(() =>
  props.esPropietario
    ? todosMisAnuncios.value.filter((anuncio) => anuncio.personajeId === props.personajeId)
    : anunciosVisitante.value,
)
const totalAnunciosActivos = computed(
  () => todosMisAnuncios.value.filter((anuncio) => anuncio.activo).length,
)

async function cargarAnuncios() {
  if (!props.personajeId) return
  cargandoAnuncios.value = true
  errorAnuncios.value = null

  try {
    if (props.esPropietario) {
      // `/anuncios/personaje/{id}` solo devuelve activos; el dueño necesita
      // también los inactivos para poder editarlos o activarlos.
      const { data } = await anunciosApi.mios()
      todosMisAnuncios.value = Array.isArray(data) ? [...data] : []
      anunciosVisitante.value = []
    } else {
      const { data } = await anunciosApi.porPersonaje(props.personajeId)
      anunciosVisitante.value = Array.isArray(data) ? [...data] : []
      todosMisAnuncios.value = []
    }
  } catch {
    errorAnuncios.value = 'No pudimos cargar los anuncios de este personaje.'
  } finally {
    cargandoAnuncios.value = false
  }
}

const {
  categoriasDisponibles,
  errorCategorias,
  modalEditor,
  editor,
  errorEditor,
  guardando,
  confirmacionEliminar,
  aviso,
  abrirEditor,
  cerrarEditor,
  guardar,
  cambiarActivo,
  pedirEliminar,
  confirmarEliminar,
} = useGestionAnuncios({ recargar: cargarAnuncios })

function abrirAnuncio(anuncio: AnuncioDTO | null = null) {
  abrirEditor(props.personajeId, anuncio)
}

function abrirNuevoAnuncio() {
  if (totalAnunciosActivos.value >= MAX_ANUNCIOS_ACTIVOS) {
    aviso.value = `Ya tienes ${MAX_ANUNCIOS_ACTIVOS} anuncios activos. Puedes crear otro, pero desactiva uno antes de activarlo.`
  }
  abrirAnuncio()
}

function activarAnuncio(anuncio: AnuncioDTO, activo: boolean) {
  void cambiarActivo(anuncio, activo, todosMisAnuncios.value)
}

onMounted(cargarAnuncios)
</script>

<template>
  <section class="anuncios-personaje" aria-labelledby="anuncios-personaje-titulo">
    <div class="anuncios-personaje__cabecera">
      <div>
        <span class="pl-kicker">Roleo</span>
        <h2 id="anuncios-personaje-titulo" class="anuncios-personaje__titulo">Anuncios RP</h2>
        <p class="anuncios-personaje__descripcion">
          {{
            esPropietario
              ? `Tienes ${totalAnunciosActivos} de ${MAX_ANUNCIOS_ACTIVOS} anuncios activos.`
              : 'Anuncios publicados por este personaje.'
          }}
        </p>
      </div>
      <button
        v-if="esPropietario"
        type="button"
        class="pl-btn pl-btn--primary pl-btn--sm"
        @click="abrirNuevoAnuncio"
      >
        <i class="bi bi-plus-circle" aria-hidden="true"></i>
        Nuevo anuncio
      </button>
    </div>

    <p v-if="cargandoAnuncios" class="pl-field__hint" role="status">Cargando anuncios…</p>

    <div v-else-if="errorAnuncios" class="pl-alert pl-alert--danger" role="alert">
      <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
      <span>{{ errorAnuncios }}</span>
      <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="cargarAnuncios()">
        Reintentar
      </button>
    </div>

    <div v-else-if="anunciosVisibles.length === 0" class="pl-empty-state pl-empty-state--compact">
      <span class="pl-empty-state__icon" aria-hidden="true"><i class="bi bi-megaphone"></i></span>
      <p class="mb-0">
        {{
          esPropietario
            ? 'Todavía no has publicado anuncios con este personaje.'
            : 'Este personaje no tiene anuncios activos.'
        }}
      </p>
    </div>

    <div v-else class="anuncios-personaje__lista">
      <TarjetaAnuncio
        v-for="anuncio in anunciosVisibles"
        :key="anuncio.idAnuncio"
        :anuncio="anuncio"
        :acciones-publicas="false"
        @editar="abrirAnuncio($event)"
        @cambiar-activo="activarAnuncio"
        @eliminar="pedirEliminar"
      />
    </div>
  </section>

  <!-- Alta y edición de anuncios RP -->
  <ModalFormulario
    v-if="modalEditor"
    :titulo="modalEditor.anuncioId === null ? 'Nuevo anuncio' : 'Editar anuncio'"
    ancho="md"
    @cerrar="cerrarEditor"
  >
    <form novalidate @submit.prevent="guardar()">
      <div class="pl-field">
        <span class="form-label">Contenido <span class="text-danger" aria-hidden="true">*</span></span>
        <RichTextEditor
          v-model="editor.contenido"
          :id="editorId"
          etiqueta="Contenido del anuncio"
        />
      </div>

      <fieldset class="pl-field">
        <legend class="form-label">Categorías (opcional)</legend>
        <p :id="categoriasHintId" class="pl-field__hint">
          Selecciona las que describan tu anuncio.
        </p>
        <div class="anuncios-personaje__categorias" :aria-describedby="categoriasHintId">
          <div v-for="categoria in categoriasDisponibles" :key="categoria.idCategoria">
            <input
              :id="categoriaId(categoria.idCategoria)"
              v-model="editor.categoriaIds"
              type="checkbox"
              :value="categoria.idCategoria"
            />
            <label :for="categoriaId(categoria.idCategoria)">
              {{ categoria.nombre }}
            </label>
          </div>
        </div>
        <p v-if="errorCategorias" class="pl-field__hint">{{ errorCategorias }}</p>
      </fieldset>

      <p v-if="errorEditor" class="pl-alert pl-alert--danger mb-0" role="alert">
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errorEditor }}
      </p>

      <div class="anuncios-personaje__acciones">
        <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarEditor">Cancelar</button>
        <button type="submit" class="pl-btn pl-btn--primary" :disabled="guardando">
          <span v-if="guardando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          {{ guardando ? 'Guardando…' : 'Guardar anuncio' }}
        </button>
      </div>
    </form>
  </ModalFormulario>

  <ModalConfirmacion
    v-if="confirmacionEliminar"
    titulo="Eliminar anuncio"
    :mensaje="`¿Eliminar el anuncio de «${confirmacionEliminar.nombrePersonaje}»? Esta acción no se puede deshacer.`"
    boton-confirmar="Eliminar"
    :peligro="true"
    @confirmar="confirmarEliminar()"
    @cancelar="confirmacionEliminar = null"
  />

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.anuncios-personaje {
  min-width: 0;
}

.anuncios-personaje__cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.anuncios-personaje__titulo {
  margin: 0 0 0.3rem;
  color: var(--pl-ink);
  font-size: 1.25rem;
  font-weight: 850;
  letter-spacing: -0.02em;
}

.anuncios-personaje__descripcion {
  margin: 0;
  color: var(--pl-muted);
  font-size: 0.9rem;
}

.anuncios-personaje__lista {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 1.25rem;
}

.anuncios-personaje .pl-alert {
  align-items: center;
}

.anuncios-personaje .pl-alert button {
  margin-left: auto;
}

.anuncios-personaje__categorias {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.85rem;
  max-height: 12rem;
  overflow-y: auto;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface-soft);
}

.anuncios-personaje__categorias > div {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 24px;
  font-size: 0.85rem;
}

.anuncios-personaje__categorias label {
  margin: 0;
  color: var(--pl-ink);
  cursor: pointer;
}

.anuncios-personaje__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

@media (max-width: 575.98px) {
  .anuncios-personaje__acciones {
    flex-direction: column;
  }

  .anuncios-personaje__acciones .pl-btn {
    width: 100%;
  }
}
</style>

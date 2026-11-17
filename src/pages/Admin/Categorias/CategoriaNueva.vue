<script setup lang="ts">
import { ref } from 'vue'
import api from '../../../services/api'
import ModalFormulario from '../../../components/ModalFormulario.vue'
import { enfocarPrimerError } from '../../../composables/useFocoPrimerError'
import {
  DESCRIPCION_MAX,
  NOMBRE_MAX,
  TIPOS_CATEGORIA,
  validarCategoria,
  type ErroresCategoria,
  type TipoCategoria,
} from './categorias'

withDefaults(defineProps<{ mostrarBoton?: boolean }>(), { mostrarBoton: true })

const emit = defineEmits<{
  (e: 'creada', nombre: string): void
}>()

const abierto = ref(false)
const formRef = ref<HTMLElement | null>(null)
const nombre = ref('')
const descripcion = ref('')
const tipo = ref<TipoCategoria>('GENERO')
const errores = ref<ErroresCategoria & { general?: string }>({})
const guardando = ref(false)

function resetForm() {
  nombre.value = ''
  descripcion.value = ''
  tipo.value = 'GENERO'
  errores.value = {}
}

/** Abre el formulario limpio. Lo usan el panel y el botón propio del componente. */
function abrir() {
  resetForm()
  abierto.value = true
}

function cerrar() {
  abierto.value = false
  errores.value = {}
}

function limpiarError(campo: 'nombre' | 'descripcion') {
  if (!errores.value[campo]) return
  errores.value = { ...errores.value, [campo]: undefined }
}

// Igual que en el listado: los 400 de validación llegan como `{campo: mensaje}`.
function repartirErrores(data: unknown): ErroresCategoria & { general?: string } {
  if (!data || typeof data !== 'object') {
    return { general: 'No se pudo crear la categoría.' }
  }
  const cuerpo = data as Record<string, unknown>
  const fallos: ErroresCategoria & { general?: string } = {}
  if (typeof cuerpo.nombre === 'string') fallos.nombre = cuerpo.nombre
  if (typeof cuerpo.descripcion === 'string') fallos.descripcion = cuerpo.descripcion
  if (!fallos.nombre && !fallos.descripcion) {
    fallos.general =
      typeof cuerpo.error === 'string' ? cuerpo.error : 'No se pudo crear la categoría.'
  }
  return fallos
}

async function crearCategoria() {
  if (guardando.value) return

  const fallos = validarCategoria(nombre.value, descripcion.value)
  if (Object.keys(fallos).length > 0) {
    errores.value = fallos
    await enfocarPrimerError(formRef.value)
    return
  }

  guardando.value = true
  errores.value = {}
  const nombreCreado = nombre.value.trim()
  try {
    await api.post('/categorias', {
      nombre: nombreCreado,
      descripcion: descripcion.value.trim(),
      tipo: tipo.value,
    })
    cerrar()
    resetForm()
    emit('creada', nombreCreado)
  } catch (e: any) {
    errores.value = repartirErrores(e?.response?.data)
    if (errores.value.nombre || errores.value.descripcion) {
      await enfocarPrimerError(formRef.value)
    }
  } finally {
    guardando.value = false
  }
}

defineExpose({ abrir })
</script>

<template>
  <div>
    <button
      v-if="mostrarBoton"
      type="button"
      class="pl-btn pl-btn--primary mb-4"
      @click="abrir"
    >
      <i class="bi bi-plus-lg" aria-hidden="true"></i>
      Nueva categoría
    </button>

    <ModalFormulario v-if="abierto" titulo="Nueva categoría" ancho="md" @cerrar="cerrar">
      <form ref="formRef" novalidate @submit.prevent="crearCategoria">
        <div v-if="errores.general" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span>{{ errores.general }}</span>
        </div>

        <div class="pl-field">
          <label class="form-label" for="nueva-categoria-nombre">
            Nombre <span class="text-danger" aria-hidden="true">*</span>
          </label>
          <input
            id="nueva-categoria-nombre"
            v-model="nombre"
            type="text"
            class="form-control"
            :maxlength="NOMBRE_MAX"
            autocomplete="off"
            required
            :aria-invalid="errores.nombre ? 'true' : undefined"
            :aria-describedby="errores.nombre ? 'nueva-categoria-nombre-error' : undefined"
            @input="limpiarError('nombre')"
          />
          <p v-if="errores.nombre" id="nueva-categoria-nombre-error" class="pl-field__error">
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.nombre }}
          </p>
        </div>

        <div class="pl-field">
          <label class="form-label" for="nueva-categoria-descripcion">Descripción</label>
          <textarea
            id="nueva-categoria-descripcion"
            v-model="descripcion"
            class="form-control"
            rows="3"
            :maxlength="DESCRIPCION_MAX"
            :aria-invalid="errores.descripcion ? 'true' : undefined"
            :aria-describedby="
              errores.descripcion ? 'nueva-categoria-descripcion-error' : undefined
            "
            @input="limpiarError('descripcion')"
          ></textarea>
          <p
            v-if="errores.descripcion"
            id="nueva-categoria-descripcion-error"
            class="pl-field__error"
          >
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.descripcion }}
          </p>
        </div>

        <div class="pl-field">
          <label class="form-label" for="nueva-categoria-tipo">Tipo</label>
          <select id="nueva-categoria-tipo" v-model="tipo" class="form-select">
            <option v-for="opcion in TIPOS_CATEGORIA" :key="opcion.value" :value="opcion.value">
              {{ opcion.label }}
            </option>
          </select>
          <p class="pl-field__hint">El tipo agrupa la categoría en el perfil del personaje.</p>
        </div>

        <div class="pl-form-acciones">
          <button type="button" class="pl-btn pl-btn--secondary" @click="cerrar">Cancelar</button>
          <button type="submit" class="pl-btn pl-btn--primary" :disabled="guardando">
            <span v-if="guardando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-plus-lg" aria-hidden="true"></i>
            {{ guardando ? 'Creando…' : 'Crear categoría' }}
          </button>
        </div>
      </form>
    </ModalFormulario>
  </div>
</template>

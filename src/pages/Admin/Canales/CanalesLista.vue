<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '../../../services/api'
import ModalConfirmacion from '../../../components/ModalConfirmacion.vue'
import ModalFormulario from '../../../components/ModalFormulario.vue'
import { enfocarPrimerError } from '../../../composables/useFocoPrimerError'
import { userStore } from '../../../store/userStore'
import TablaAdmin from '../components/TablaAdmin.vue'

interface CanalModerado {
  id: number
  nombre: string
  descripcion: string | null
  tipo: 'OFFICIAL' | 'USER_CREATED' | string
  privado: boolean
  visible: boolean
  imagenUrl: string | null
  fechaCreacion: string | null
  creadorId: number | null
  creadorNombre: string | null
  creadoPorUsuarioId: number | null
  creadoPorUsuarioNombre: string | null
  miembroCount: number
  suspendido: boolean
  suspendidoActivo: boolean
  suspendidoHasta: string | null
  fechaSuspension: string | null
  suspendidoPorId: number | null
  suspendidoPorNombre: string | null
  motivoSuspension: string | null
}

type ModoFormulario = 'suspender' | 'restaurar' | 'eliminar'
type ModoOficial = 'marcar' | 'desmarcar'
type FiltroEstado = '' | 'activos' | 'suspendidos'
type FiltroTipo = '' | 'OFFICIAL' | 'USER_CREATED'

interface PersonajeOpcion {
  idPersonaje: number
  nombre: string
}

const props = withDefaults(
  defineProps<{
    resaltarId?: number | null
  }>(),
  { resaltarId: null }
)

const columnas = [
  { etiqueta: 'Canal' },
  { etiqueta: 'Tipo' },
  { etiqueta: 'Creador' },
  { etiqueta: 'Miembros' },
  { etiqueta: 'Estado' },
  { etiqueta: 'Registro' },
  { etiqueta: 'Acciones' },
]

const opcionesDuracion = [
  { value: '1H', label: '1 hora' },
  { value: '24H', label: '24 horas' },
  { value: '7D', label: '7 días' },
  { value: '30D', label: '30 días' },
  { value: 'INDEFINIDA', label: 'Indefinida (hasta restaurar)' },
]

const canales = ref<CanalModerado[]>([])
const cargando = ref(false)
const error = ref('')
const feedback = ref<{ tipo: 'success' | 'danger'; texto: string } | null>(null)

const busqueda = ref('')
const filtroEstado = ref<FiltroEstado>('')
const filtroTipo = ref<FiltroTipo>('')

const esAdmin = computed(() => userStore.usuario.value?.role === 'ADMIN')

// Formulario único para suspender, restaurar o eliminar el canal seleccionado.
const formAbierto = ref(false)
const formRef = ref<HTMLElement | null>(null)
const modo = ref<ModoFormulario>('suspender')
const canalSeleccionado = ref<CanalModerado | null>(null)
const formDuracion = ref('24H')
const formMotivo = ref('')
const erroresForm = ref<{ motivo?: string }>({})
const enviando = ref(false)

// Marcar o quitar la marca de oficial.
const confirmacionOficial = ref<{ canal: CanalModerado; modo: ModoOficial } | null>(null)
const procesandoOficial = ref(false)

// Crear un canal oficial nuevo con un personaje responsable.
const personajes = ref<PersonajeOpcion[]>([])
const cargandoPersonajes = ref(false)
const modalOficialAbierto = ref(false)
const oficialFormRef = ref<HTMLElement | null>(null)
const oficialNombre = ref('')
const oficialDescripcion = ref('')
const oficialPersonajeId = ref<number | ''>('')
const oficialImagen = ref<File | null>(null)
const oficialImagenPreview = ref<string | null>(null)
const inputImagenOficialRef = ref<HTMLInputElement | null>(null)
const erroresOficial = ref<{ nombre?: string; descripcion?: string; personaje?: string; imagen?: string }>({})
const errorOficial = ref('')
const enviandoOficial = ref(false)

const filaResaltada = ref<number | null>(null)
let temporizadorResaltado: number | null = null

const hayFiltros = computed(
  () => busqueda.value.trim() !== '' || filtroEstado.value !== '' || filtroTipo.value !== ''
)

const canalesFiltrados = computed(() => {
  const texto = normalizar(busqueda.value.trim())
  return canales.value.filter((canal) => {
    if (filtroTipo.value && canal.tipo !== filtroTipo.value) return false
    const suspendido = estaSuspendido(canal)
    if (filtroEstado.value === 'activos' && suspendido) return false
    if (filtroEstado.value === 'suspendidos' && !suspendido) return false
    if (!texto) return true
    return (
      normalizar(canal.nombre).includes(texto) ||
      normalizar(canal.descripcion ?? '').includes(texto) ||
      normalizar(nombreCreador(canal)).includes(texto) ||
      normalizar(canal.motivoSuspension ?? '').includes(texto)
    )
  })
})

const totalSuspendidos = computed(() => canales.value.filter((canal) => estaSuspendido(canal)).length)

const resumen = computed(() => {
  const total = canales.value.length
  if (hayFiltros.value) return `${canalesFiltrados.value.length} de ${total} canales`
  return `${total} ${total === 1 ? 'canal' : 'canales'} · ${totalSuspendidos.value} ${
    totalSuspendidos.value === 1 ? 'suspendido' : 'suspendidos'
  }`
})

const mensajeVacio = computed(() =>
  hayFiltros.value
    ? 'Ningún canal coincide con los filtros aplicados.'
    : 'No hay canales creados todavía.'
)

const tituloFormulario = computed(() => {
  if (modo.value === 'restaurar') return 'Restaurar canal'
  if (modo.value === 'eliminar') return 'Eliminar canal definitivamente'
  return 'Suspender canal'
})

const etiquetaEnviar = computed(() => {
  if (modo.value === 'restaurar') return 'Restaurar'
  if (modo.value === 'eliminar') return 'Eliminar'
  return 'Suspender'
})

const ayudaMotivo = computed(() => {
  if (modo.value === 'restaurar') return 'Opcional. Se guarda en la auditoría de moderación.'
  if (modo.value === 'eliminar') {
    return 'Obligatorio. Se guarda en la auditoría junto al nombre del canal.'
  }
  return 'Obligatorio. Los miembros lo verán en el aviso de suspensión.'
})

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function estaSuspendido(canal: CanalModerado): boolean {
  return canal.suspendidoActivo
}

function nombreCreador(canal: CanalModerado): string {
  return canal.creadoPorUsuarioNombre ?? canal.creadorNombre ?? '—'
}

function tipoCreador(canal: CanalModerado): string | null {
  if (canal.creadoPorUsuarioId !== null) return 'Cuenta'
  if (canal.creadorId !== null) return 'Personaje'
  return null
}

function etiquetaTipo(tipo: string): string {
  if (tipo === 'OFFICIAL') return 'Oficial'
  if (tipo === 'USER_CREATED') return 'Comunidad'
  return tipo
}

function fechaLegible(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function limpiarFiltros() {
  busqueda.value = ''
  filtroEstado.value = ''
  filtroTipo.value = ''
}

async function cargarCanales() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/moderacion/canales')
    canales.value = Array.isArray(data) ? data : []
  } catch {
    canales.value = []
    error.value = 'Error al cargar los canales.'
  } finally {
    cargando.value = false
  }
}

function abrirFormulario(canal: CanalModerado, nuevoModo: ModoFormulario) {
  canalSeleccionado.value = canal
  modo.value = nuevoModo
  formDuracion.value = '24H'
  formMotivo.value = ''
  erroresForm.value = {}
  formAbierto.value = true
}

function cerrarFormulario() {
  if (enviando.value) return
  formAbierto.value = false
  canalSeleccionado.value = null
  erroresForm.value = {}
}

function limpiarError() {
  if (!erroresForm.value.motivo) return
  erroresForm.value = { ...erroresForm.value, motivo: undefined }
}

function validarFormulario(): boolean {
  const errores: { motivo?: string } = {}
  const motivo = formMotivo.value.trim()

  if (modo.value !== 'restaurar' && !motivo) {
    errores.motivo = 'Escribe el motivo de la acción.'
  } else if (motivo.length > 255) {
    errores.motivo = 'El motivo no puede superar 255 caracteres.'
  }

  erroresForm.value = errores
  return Object.keys(errores).length === 0
}

async function enviarFormulario() {
  const canal = canalSeleccionado.value
  if (!canal || enviando.value) return
  if (!validarFormulario()) {
    await enfocarPrimerError(formRef.value)
    return
  }

  enviando.value = true
  const motivo = formMotivo.value.trim()
  try {
    if (modo.value === 'suspender') {
      await api.post(`/moderacion/canales/${canal.id}/suspender`, {
        duracion: formDuracion.value,
        motivo,
      })
      feedback.value = {
        tipo: 'success',
        texto: `Se suspendió el canal ${canal.nombre}.`,
      }
    } else if (modo.value === 'restaurar') {
      await api.post(`/moderacion/canales/${canal.id}/restaurar`, {
        motivo: motivo || null,
      })
      feedback.value = {
        tipo: 'success',
        texto: `Se restauró el canal ${canal.nombre}.`,
      }
    } else {
      await api.delete(`/moderacion/canales/${canal.id}`, { data: { motivo } })
      feedback.value = {
        tipo: 'success',
        texto: `Se eliminó definitivamente el canal ${canal.nombre}.`,
      }
    }
    formAbierto.value = false
    canalSeleccionado.value = null
    await cargarCanales()
  } catch (e: any) {
    const data = e?.response?.data
    feedback.value = {
      tipo: 'danger',
      texto: data?.error || data?.message || 'No se pudo completar la acción.',
    }
  } finally {
    enviando.value = false
  }
}

const mensajeConfirmacionOficial = computed(() => {
  const confirmacion = confirmacionOficial.value
  if (!confirmacion) return ''
  if (confirmacion.modo === 'marcar') {
    return `¿Marcar "${confirmacion.canal.nombre}" como canal oficial? Pasará a ser público y su dueño no podrá hacerlo privado ni eliminarlo.`
  }
  return `¿Quitar la marca de oficial a "${confirmacion.canal.nombre}"? El canal seguirá siendo público y el dueño podrá volver a gestionarlo con normalidad.`
})

function abrirConfirmacionOficial(canal: CanalModerado, modo: ModoOficial) {
  confirmacionOficial.value = { canal, modo }
}

function cerrarConfirmacionOficial() {
  if (procesandoOficial.value) return
  confirmacionOficial.value = null
}

async function confirmarCambioOficial() {
  const confirmacion = confirmacionOficial.value
  if (!confirmacion || procesandoOficial.value) return

  procesandoOficial.value = true
  try {
    if (confirmacion.modo === 'marcar') {
      await api.post(`/moderacion/canales/${confirmacion.canal.id}/oficial`)
      feedback.value = {
        tipo: 'success',
        texto: `Se marcó el canal ${confirmacion.canal.nombre} como oficial.`,
      }
    } else {
      await api.delete(`/moderacion/canales/${confirmacion.canal.id}/oficial`)
      feedback.value = {
        tipo: 'success',
        texto: `Se quitó la marca de oficial al canal ${confirmacion.canal.nombre}.`,
      }
    }
    confirmacionOficial.value = null
    await cargarCanales()
  } catch (e: any) {
    const data = e?.response?.data
    feedback.value = {
      tipo: 'danger',
      texto: data?.error || data?.message || 'No se pudo completar la acción.',
    }
    confirmacionOficial.value = null
  } finally {
    procesandoOficial.value = false
  }
}

async function cargarPersonajes() {
  if (personajes.value.length > 0 || cargandoPersonajes.value) return
  cargandoPersonajes.value = true
  try {
    const { data } = await api.get('/personajes')
    personajes.value = Array.isArray(data) ? data : []
  } catch {
    personajes.value = []
  } finally {
    cargandoPersonajes.value = false
  }
}

async function abrirModalOficial() {
  oficialNombre.value = ''
  oficialDescripcion.value = ''
  oficialPersonajeId.value = ''
  erroresOficial.value = {}
  errorOficial.value = ''
  limpiarImagenOficial()
  modalOficialAbierto.value = true
  await cargarPersonajes()
}

function cerrarModalOficial() {
  if (enviandoOficial.value) return
  limpiarImagenOficial()
  modalOficialAbierto.value = false
}

function obtenerDimensionesImagen(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

async function validarImagenOficial(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Formato no permitido. Solo JPG, PNG y WEBP.'
  }
  if (file.size > 10 * 1024 * 1024) {
    return 'La imagen no puede superar 10 MB.'
  }
  const dims = await obtenerDimensionesImagen(file)
  if (!dims) return 'El archivo no es una imagen válida.'
  if (dims.width > 400 || dims.height > 400) {
    return `La imagen no puede superar 400x400 píxeles (la actual tiene ${dims.width}x${dims.height}).`
  }
  return null
}

async function onImagenOficialChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const error = await validarImagenOficial(file)
  if (error) {
    erroresOficial.value = { ...erroresOficial.value, imagen: error }
    input.value = ''
    return
  }

  limpiarImagenOficial()
  oficialImagen.value = file
  oficialImagenPreview.value = URL.createObjectURL(file)
  erroresOficial.value = { ...erroresOficial.value, imagen: undefined }
}

function limpiarImagenOficial() {
  if (oficialImagenPreview.value) URL.revokeObjectURL(oficialImagenPreview.value)
  oficialImagen.value = null
  oficialImagenPreview.value = null
  if (inputImagenOficialRef.value) inputImagenOficialRef.value.value = ''
}

function limpiarErrorOficial(campo: keyof typeof erroresOficial.value) {
  if (!erroresOficial.value[campo]) return
  erroresOficial.value = { ...erroresOficial.value, [campo]: undefined }
}

async function enviarCrearOficial() {
  if (enviandoOficial.value) return

  const errores: typeof erroresOficial.value = {}
  const nombre = oficialNombre.value.trim()
  const descripcion = oficialDescripcion.value.trim()

  if (!nombre) errores.nombre = 'El nombre es obligatorio.'
  else if (nombre.length > 100) errores.nombre = 'El nombre no puede superar 100 caracteres.'

  if (descripcion.length > 500) errores.descripcion = 'La descripción no puede superar 500 caracteres.'

  if (oficialPersonajeId.value === '' || oficialPersonajeId.value == null) {
    errores.personaje = 'Elige el personaje responsable del canal.'
  }

  erroresOficial.value = errores
  if (Object.keys(errores).length > 0) {
    await enfocarPrimerError(oficialFormRef.value)
    return
  }

  if (oficialImagen.value) {
    const errorImagen = await validarImagenOficial(oficialImagen.value)
    if (errorImagen) {
      erroresOficial.value = { ...erroresOficial.value, imagen: errorImagen }
      await enfocarPrimerError(oficialFormRef.value)
      return
    }
  }

  errorOficial.value = ''
  enviandoOficial.value = true
  try {
    const datos = {
      nombre,
      descripcion: descripcion || null,
      personajeResponsableId: Number(oficialPersonajeId.value),
    }
    const formData = new FormData()
    formData.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
    if (oficialImagen.value) formData.append('imagenFile', oficialImagen.value)

    await api.post('/moderacion/canales/oficiales', formData)
    feedback.value = { tipo: 'success', texto: `Se creó el canal oficial ${nombre}.` }
    modalOficialAbierto.value = false
    limpiarImagenOficial()
    await cargarCanales()
  } catch (e: any) {
    const data = e?.response?.data
    errorOficial.value = data?.error || data?.message || 'No se pudo crear el canal oficial.'
  } finally {
    enviandoOficial.value = false
  }
}

function limpiarResaltado() {
  if (temporizadorResaltado !== null) {
    window.clearTimeout(temporizadorResaltado)
    temporizadorResaltado = null
  }
  filaResaltada.value = null
}

async function resaltarCanal(id: number) {
  limpiarResaltado()
  filaResaltada.value = id
  await nextTick()
  const fila = document.getElementById(`canal-moderacion-${id}`)
  const reducido =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  fila?.scrollIntoView({ block: 'center', behavior: reducido ? 'auto' : 'smooth' })
  fila?.focus?.({ preventScroll: true })
  temporizadorResaltado = window.setTimeout(limpiarResaltado, 4000)
}

watch(
  () => props.resaltarId,
  (id) => {
    if (id == null) return
    if (canales.value.length === 0 && !cargando.value) {
      void cargarCanales().then(() => resaltarCanal(id))
      return
    }
    void resaltarCanal(id)
  }
)

onMounted(async () => {
  await cargarCanales()
  if (props.resaltarId != null) await resaltarCanal(props.resaltarId)
})

onBeforeUnmount(limpiarResaltado)
</script>

<template>
  <div>
    <div
      v-if="feedback"
      class="pl-alert"
      :class="`pl-alert--${feedback.tipo}`"
      :role="feedback.tipo === 'danger' ? 'alert' : 'status'"
    >
      <i
        class="bi"
        :class="feedback.tipo === 'danger' ? 'bi-exclamation-triangle' : 'bi-check-circle'"
        aria-hidden="true"
      ></i>
      <span>{{ feedback.texto }}</span>
      <button type="button" class="btn-close ms-auto" aria-label="Cerrar aviso" @click="feedback = null"></button>
    </div>

    <TablaAdmin
      titulo="Canales de la comunidad"
      :columnas="columnas"
      :total="canalesFiltrados.length"
      :cargando="cargando"
      :error="error"
      :vacio="mensajeVacio"
      :resumen="resumen"
    >
      <template #barra>
        <div class="pl-admin-barra" role="search" aria-label="Filtros de la tabla">
          <div class="pl-admin-barra__campo">
            <label for="canales-buscar">Buscar</label>
            <input
              id="canales-buscar"
              v-model="busqueda"
              type="search"
              class="form-control"
              placeholder="Nombre, creador o motivo"
              autocomplete="off"
            />
          </div>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--corto">
            <label for="canales-tipo">Tipo</label>
            <select id="canales-tipo" v-model="filtroTipo" class="form-select">
              <option value="">Todos</option>
              <option value="OFFICIAL">Oficiales</option>
              <option value="USER_CREATED">Comunidad</option>
            </select>
          </div>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--corto">
            <label for="canales-estado">Estado</label>
            <select id="canales-estado" v-model="filtroEstado" class="form-select">
              <option value="">Todos</option>
              <option value="activos">Activos</option>
              <option value="suspendidos">Suspendidos</option>
            </select>
          </div>
          <div class="pl-admin-barra__acciones">
            <button
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :disabled="!hayFiltros"
              @click="limpiarFiltros"
            >
              <i class="bi bi-eraser" aria-hidden="true"></i>
              Limpiar
            </button>
            <button
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :disabled="cargando"
              @click="cargarCanales"
            >
              <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
              Refrescar
            </button>
            <button
              v-if="esAdmin"
              type="button"
              class="pl-btn pl-btn--primary pl-btn--sm"
              @click="abrirModalOficial"
            >
              <i class="bi bi-patch-plus" aria-hidden="true"></i>
              Crear oficial
            </button>
          </div>
          <p class="pl-admin-barra__nota">
            Suspender oculta el canal y bloquea la lectura y escritura sin borrar mensajes ni miembros.
            La eliminación definitiva solo está disponible para ADMIN. Un canal oficial es siempre público
            y no se puede eliminar hasta quitarle la marca.
          </p>
        </div>
      </template>

      <tr
        v-for="canal in canalesFiltrados"
        :id="`canal-moderacion-${canal.id}`"
        :key="canal.id"
        :class="{ 'pl-canal--resaltado': filaResaltada === canal.id }"
        tabindex="-1"
      >
        <th scope="row">
          <div class="pl-tabla-admin__principal-texto">
            <strong>{{ canal.nombre }}</strong>
            <span class="pl-tabla-admin__secundario">#{{ canal.id }}</span>
          </div>
          <span v-if="canal.privado" class="pl-tabla-admin__secundario">Privado</span>
        </th>
        <td data-etiqueta="Tipo">
          <span
            class="pl-status-pill"
            :class="canal.tipo === 'OFFICIAL' ? 'pl-status-pill--warning' : 'pl-status-pill--info'"
          >
            {{ etiquetaTipo(canal.tipo) }}
          </span>
        </td>
        <td data-etiqueta="Creador">
          <span>{{ nombreCreador(canal) }}</span>
          <span v-if="tipoCreador(canal)" class="pl-tabla-admin__secundario">
            {{ tipoCreador(canal) }}
          </span>
        </td>
        <td data-etiqueta="Miembros">{{ canal.miembroCount }}</td>
        <td data-etiqueta="Estado">
          <span
            :class="
              estaSuspendido(canal)
                ? 'pl-status-pill pl-status-pill--danger'
                : 'pl-status-pill'
            "
          >
            {{ estaSuspendido(canal) ? 'Suspendido' : 'Activo' }}
          </span>
          <span v-if="estaSuspendido(canal)" class="pl-tabla-admin__secundario">
            <template v-if="canal.suspendidoHasta">Hasta {{ fechaLegible(canal.suspendidoHasta) }}</template>
            <template v-else>Sin vencimiento</template>
          </span>
          <span v-if="estaSuspendido(canal) && canal.motivoSuspension" class="pl-tabla-admin__clamp">
            {{ canal.motivoSuspension }}
          </span>
        </td>
        <td data-etiqueta="Registro">
          <span class="pl-tabla-admin__fecha">{{ fechaLegible(canal.fechaCreacion) }}</span>
          <span v-if="canal.suspendidoPorNombre" class="pl-tabla-admin__secundario">
            suspendió {{ canal.suspendidoPorNombre }}
          </span>
        </td>
        <td data-etiqueta="Acciones">
          <div class="pl-tabla-admin__acciones">
            <button
              v-if="!estaSuspendido(canal)"
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Suspender el canal ${canal.nombre}`"
              @click="abrirFormulario(canal, 'suspender')"
            >
              <i class="bi bi-pause-circle" aria-hidden="true"></i>
              Suspender
            </button>
            <button
              v-else
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Restaurar el canal ${canal.nombre}`"
              @click="abrirFormulario(canal, 'restaurar')"
            >
              <i class="bi bi-play-circle" aria-hidden="true"></i>
              Restaurar
            </button>
            <button
              v-if="esAdmin && canal.tipo !== 'OFFICIAL'"
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Marcar el canal ${canal.nombre} como oficial`"
              @click="abrirConfirmacionOficial(canal, 'marcar')"
            >
              <i class="bi bi-patch-check" aria-hidden="true"></i>
              Marcar oficial
            </button>
            <button
              v-if="esAdmin && canal.tipo === 'OFFICIAL'"
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Quitar la marca de oficial al canal ${canal.nombre}`"
              @click="abrirConfirmacionOficial(canal, 'desmarcar')"
            >
              <i class="bi bi-patch-minus" aria-hidden="true"></i>
              Quitar oficial
            </button>
            <button
              v-if="esAdmin && canal.tipo !== 'OFFICIAL'"
              type="button"
              class="pl-btn pl-btn--danger-ghost pl-btn--sm"
              :aria-label="`Eliminar definitivamente el canal ${canal.nombre}`"
              @click="abrirFormulario(canal, 'eliminar')"
            >
              <i class="bi bi-trash" aria-hidden="true"></i>
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </TablaAdmin>

    <ModalFormulario
      v-if="formAbierto && canalSeleccionado"
      :titulo="tituloFormulario"
      ancho="md"
      @cerrar="cerrarFormulario"
    >
      <form ref="formRef" novalidate @submit.prevent="enviarFormulario">
        <p class="pl-tabla-admin__secundario">
          <i class="bi bi-hash" aria-hidden="true"></i>
          {{ canalSeleccionado.nombre }} · #{{ canalSeleccionado.id }}
        </p>

        <p v-if="modo === 'eliminar'" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span>
            Se borrarán el canal, sus mensajes y sus miembros. Esta acción no se puede deshacer.
          </span>
        </p>

        <div class="row g-3">
          <div v-if="modo === 'suspender'" class="col-12 pl-field">
            <label class="form-label" for="canal-duracion">Duración</label>
            <select id="canal-duracion" v-model="formDuracion" class="form-select">
              <option v-for="opcion in opcionesDuracion" :key="opcion.value" :value="opcion.value">
                {{ opcion.label }}
              </option>
            </select>
          </div>

          <div class="col-12 pl-field">
            <label class="form-label" for="canal-motivo">
              Motivo
              <span v-if="modo !== 'restaurar'" class="text-danger" aria-hidden="true">*</span>
              <span v-else class="pl-tabla-admin__secundario">(opcional)</span>
            </label>
            <textarea
              id="canal-motivo"
              v-model="formMotivo"
              class="form-control"
              rows="3"
              maxlength="255"
              autocomplete="off"
              :aria-invalid="erroresForm.motivo ? 'true' : undefined"
              :aria-describedby="erroresForm.motivo ? 'canal-motivo-error' : 'canal-motivo-ayuda'"
              @input="limpiarError"
            ></textarea>
            <p v-if="erroresForm.motivo" id="canal-motivo-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresForm.motivo }}
            </p>
            <p v-else id="canal-motivo-ayuda" class="pl-field__hint">{{ ayudaMotivo }}</p>
          </div>
        </div>

        <div class="pl-form-acciones">
          <button type="button" class="pl-btn pl-btn--secondary" :disabled="enviando" @click="cerrarFormulario">
            Cancelar
          </button>
          <button
            type="submit"
            class="pl-btn"
            :class="modo === 'restaurar' ? 'pl-btn--success' : 'pl-btn--danger'"
            :disabled="enviando"
          >
            <span v-if="enviando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i
              v-else
              class="bi"
              :class="modo === 'restaurar' ? 'bi-play-circle' : modo === 'eliminar' ? 'bi-trash' : 'bi-pause-circle'"
              aria-hidden="true"
            ></i>
            {{ enviando ? 'Guardando…' : etiquetaEnviar }}
          </button>
        </div>
      </form>
    </ModalFormulario>

    <ModalConfirmacion
      v-if="confirmacionOficial"
      :titulo="confirmacionOficial.modo === 'marcar' ? 'Marcar canal como oficial' : 'Quitar marca de oficial'"
      :mensaje="mensajeConfirmacionOficial"
      :boton-confirmar="
        procesandoOficial
          ? 'Guardando…'
          : confirmacionOficial.modo === 'marcar'
            ? 'Marcar oficial'
            : 'Quitar marca'
      "
      :peligro="confirmacionOficial.modo === 'desmarcar'"
      @confirmar="confirmarCambioOficial"
      @cancelar="cerrarConfirmacionOficial"
    />

    <ModalFormulario
      v-if="modalOficialAbierto"
      titulo="Crear canal oficial"
      ancho="md"
      @cerrar="cerrarModalOficial"
    >
      <form ref="oficialFormRef" novalidate @submit.prevent="enviarCrearOficial">
        <p class="pl-tabla-admin__secundario">
          <i class="bi bi-patch-check" aria-hidden="true"></i>
          Los canales oficiales son siempre públicos. El personaje responsable quedará como dueño.
        </p>

        <div class="row g-3">
          <div class="col-12 pl-field">
            <label class="form-label" for="oficial-nombre">
              Nombre <span class="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="oficial-nombre"
              v-model="oficialNombre"
              type="text"
              class="form-control"
              maxlength="100"
              autocomplete="off"
              :aria-invalid="erroresOficial.nombre ? 'true' : undefined"
              :aria-describedby="erroresOficial.nombre ? 'oficial-nombre-error' : undefined"
              @input="limpiarErrorOficial('nombre')"
            />
            <p v-if="erroresOficial.nombre" id="oficial-nombre-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresOficial.nombre }}
            </p>
          </div>

          <div class="col-12 pl-field">
            <label class="form-label" for="oficial-descripcion">Descripción</label>
            <textarea
              id="oficial-descripcion"
              v-model="oficialDescripcion"
              class="form-control"
              rows="3"
              maxlength="500"
              :aria-invalid="erroresOficial.descripcion ? 'true' : undefined"
              :aria-describedby="erroresOficial.descripcion ? 'oficial-descripcion-error' : undefined"
              @input="limpiarErrorOficial('descripcion')"
            ></textarea>
            <p v-if="erroresOficial.descripcion" id="oficial-descripcion-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresOficial.descripcion }}
            </p>
          </div>

          <div class="col-12 pl-field">
            <label class="form-label" for="oficial-personaje">
              Personaje responsable <span class="text-danger" aria-hidden="true">*</span>
            </label>
            <select
              id="oficial-personaje"
              v-model="oficialPersonajeId"
              class="form-select"
              :disabled="cargandoPersonajes"
              :aria-invalid="erroresOficial.personaje ? 'true' : undefined"
              :aria-describedby="
                erroresOficial.personaje ? 'oficial-personaje-error' : 'oficial-personaje-ayuda'
              "
              @change="limpiarErrorOficial('personaje')"
            >
              <option value="">{{ cargandoPersonajes ? 'Cargando personajes…' : 'Selecciona un personaje' }}</option>
              <option v-for="p in personajes" :key="p.idPersonaje" :value="p.idPersonaje">
                {{ p.nombre }}
              </option>
            </select>
            <p v-if="erroresOficial.personaje" id="oficial-personaje-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresOficial.personaje }}
            </p>
            <p v-else id="oficial-personaje-ayuda" class="pl-field__hint">
              Quedará como DUEÑO y podrá gestionar nombre, descripción, miembros e invitaciones.
            </p>
          </div>

          <div class="col-12 pl-field">
            <label class="form-label" for="oficial-imagen">Imagen del canal (opcional)</label>
            <div class="d-flex align-items-center gap-3">
              <img
                v-if="oficialImagenPreview"
                :src="oficialImagenPreview"
                class="pl-avatar"
                width="48"
                height="48"
                alt=""
              />
              <div class="flex-grow-1">
                <input
                  id="oficial-imagen"
                  ref="inputImagenOficialRef"
                  type="file"
                  class="form-control form-control-sm"
                  accept="image/jpeg,image/png,image/webp"
                  @change="onImagenOficialChange"
                />
                <p class="pl-field__hint mb-0">JPG, PNG o WEBP. Máx. 400x400 px y 10 MB.</p>
              </div>
              <button
                v-if="oficialImagenPreview"
                type="button"
                class="pl-btn pl-btn--secondary pl-btn--sm"
                aria-label="Quitar la imagen del canal"
                @click="limpiarImagenOficial"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <p v-if="erroresOficial.imagen" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresOficial.imagen }}
            </p>
          </div>
        </div>

        <p v-if="errorOficial" class="pl-alert pl-alert--danger mt-3" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span>{{ errorOficial }}</span>
        </p>

        <div class="pl-form-acciones">
          <button
            type="button"
            class="pl-btn pl-btn--secondary"
            :disabled="enviandoOficial"
            @click="cerrarModalOficial"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="pl-btn pl-btn--primary"
            :disabled="enviandoOficial || cargandoPersonajes"
          >
            <span v-if="enviandoOficial" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-check-lg" aria-hidden="true"></i>
            {{ enviandoOficial ? 'Creando…' : 'Crear canal oficial' }}
          </button>
        </div>
      </form>
    </ModalFormulario>
  </div>
</template>

<style scoped>
.pl-canal--resaltado > * {
  background: rgba(var(--pl-primary-rgb), 0.12);
}

.pl-canal--resaltado {
  outline: 2px solid var(--pl-primary);
  outline-offset: -2px;
}
</style>

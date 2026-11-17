<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../../services/api'
import ModalConfirmacion from '../../../components/ModalConfirmacion.vue'
import ModalFormulario from '../../../components/ModalFormulario.vue'
import { enfocarPrimerError } from '../../../composables/useFocoPrimerError'
import TablaAdmin from '../components/TablaAdmin.vue'

interface Baneo {
  idBaneoGlobal: number
  tipo: 'USUARIO' | 'PERSONAJE'
  idObjetivo: number
  nombreObjetivo: string
  motivo: string | null
  baneadoPorNombre: string | null
  fechaBaneo: string
  fechaExpiracion: string | null
  activo: boolean
}

type FiltroEstado = '' | 'activos' | 'expirados'
type FiltroTipo = '' | 'USUARIO' | 'PERSONAJE'

const columnas = [
  { etiqueta: 'Objetivo' },
  { etiqueta: 'Tipo' },
  { etiqueta: 'Motivo' },
  { etiqueta: 'Estado' },
  { etiqueta: 'Registro' },
  { etiqueta: 'Acciones' },
]

const opcionesDuracion = [
  { value: '1H', label: '1 hora' },
  { value: '24H', label: '24 horas' },
  { value: '7D', label: '7 días' },
  { value: 'PERMANENTE', label: 'Permanente' },
]

const baneos = ref<Baneo[]>([])
const cargando = ref(false)
const error = ref('')
const feedback = ref<{ tipo: 'success' | 'danger'; texto: string } | null>(null)

const busqueda = ref('')
const filtroEstado = ref<FiltroEstado>('')
const filtroTipo = ref<FiltroTipo>('')

// Formulario de alta
const formAbierto = ref(false)
const formRef = ref<HTMLElement | null>(null)
const formTipo = ref<'USUARIO' | 'PERSONAJE'>('USUARIO')
const formIdTexto = ref('')
const formDuracion = ref('PERMANENTE')
const formMotivo = ref('')
const erroresForm = ref<{ id?: string }>({})
const comprobando = ref(false)

interface Confirmacion {
  titulo: string
  mensaje: string
  boton: string
  peligro: boolean
  ejecutar: () => Promise<void>
  alCancelar?: () => void
}

const confirmacion = ref<Confirmacion | null>(null)

const hayFiltros = computed(
  () => busqueda.value.trim() !== '' || filtroEstado.value !== '' || filtroTipo.value !== ''
)

const baneosFiltrados = computed(() => {
  const texto = normalizar(busqueda.value.trim())
  return baneos.value.filter((baneo) => {
    if (filtroTipo.value && baneo.tipo !== filtroTipo.value) return false
    if (filtroEstado.value === 'activos' && !baneo.activo) return false
    if (filtroEstado.value === 'expirados' && baneo.activo) return false
    if (!texto) return true
    return (
      normalizar(baneo.nombreObjetivo).includes(texto) ||
      normalizar(baneo.motivo ?? '').includes(texto) ||
      normalizar(baneo.baneadoPorNombre ?? '').includes(texto)
    )
  })
})

const totalActivos = computed(() => baneos.value.filter((baneo) => baneo.activo).length)

const resumen = computed(() => {
  const total = baneos.value.length
  if (hayFiltros.value) {
    return `${baneosFiltrados.value.length} de ${total} baneos`
  }
  return `${total} ${total === 1 ? 'baneo' : 'baneos'} · ${totalActivos.value} ${
    totalActivos.value === 1 ? 'activo' : 'activos'
  }`
})

const mensajeVacio = computed(() =>
  hayFiltros.value
    ? 'Ningún baneo coincide con los filtros aplicados.'
    : 'No hay baneos registrados.'
)

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function fechaLegible(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function etiquetaTipo(tipo: Baneo['tipo']): string {
  return tipo === 'USUARIO' ? 'Usuario' : 'Personaje'
}

function etiquetaDuracion(valor: string): string {
  return opcionesDuracion.find((opcion) => opcion.value === valor)?.label ?? valor
}

function limpiarFiltros() {
  busqueda.value = ''
  filtroEstado.value = ''
  filtroTipo.value = ''
}

async function cargarBaneos() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/moderacion/baneos')
    baneos.value = Array.isArray(data) ? data : []
  } catch {
    baneos.value = []
    error.value = 'Error al cargar los baneos.'
  } finally {
    cargando.value = false
  }
}

function abrirFormulario() {
  formTipo.value = 'USUARIO'
  formIdTexto.value = ''
  formDuracion.value = 'PERMANENTE'
  formMotivo.value = ''
  erroresForm.value = {}
  formAbierto.value = true
}

function cerrarFormulario() {
  formAbierto.value = false
  erroresForm.value = {}
}

function cambiarTipo() {
  formIdTexto.value = ''
  limpiarError('id')
}

function limpiarError(campo: 'id') {
  if (!erroresForm.value[campo]) return
  erroresForm.value = { ...erroresForm.value, [campo]: undefined }
}

function validarFormulario(): boolean {
  const errores: { id?: string } = {}
  const texto = formIdTexto.value.trim()

  if (!texto) errores.id = 'Escribe el id numérico del objetivo.'
  else if (!/^\d+$/.test(texto) || Number(texto) < 1) {
    errores.id = 'El id debe ser un número entero mayor que cero.'
  }

  erroresForm.value = errores
  return Object.keys(errores).length === 0
}

// Resuelve el nombre del objetivo para que la confirmación diga a quién se
// banea. Es informativo: si falla, la confirmación usa el id.
async function resolverNombre(tipo: 'USUARIO' | 'PERSONAJE', id: number): Promise<string | null> {
  const ruta = tipo === 'USUARIO' ? `/usuarios/${id}` : `/personajes/${id}`
  try {
    const { data } = await api.get(ruta)
    return data?.nombre ?? null
  } catch {
    return null
  }
}

async function pedirCrear() {
  if (comprobando.value) return
  if (!validarFormulario()) {
    await enfocarPrimerError(formRef.value)
    return
  }

  const id = Number(formIdTexto.value.trim())
  const tipo = formTipo.value
  comprobando.value = true
  const nombre = await resolverNombre(tipo, id)
  comprobando.value = false

  const objetivo = nombre
    ? `${nombre} (#${id})`
    : `${tipo === 'USUARIO' ? 'el usuario' : 'el personaje'} #${id}`

  formAbierto.value = false
  confirmacion.value = {
    titulo: 'Crear baneo',
    mensaje: `¿Banear a ${objetivo} durante ${etiquetaDuracion(formDuracion.value).toLowerCase()}?`,
    boton: 'Banear',
    peligro: true,
    alCancelar: () => {
      formAbierto.value = true
    },
    ejecutar: async () => {
      try {
        await api.post('/moderacion/baneos', {
          tipo,
          id,
          duracion: formDuracion.value,
          motivo: formMotivo.value.trim() || null,
        })
        formIdTexto.value = ''
        formMotivo.value = ''
        formDuracion.value = 'PERMANENTE'
        feedback.value = { tipo: 'success', texto: `Se baneó a ${objetivo}.` }
        await cargarBaneos()
      } catch (e: any) {
        const data = e?.response?.data
        feedback.value = {
          tipo: 'danger',
          texto: data?.error || data?.message || 'No se pudo crear el baneo.',
        }
      }
    },
  }
}

function pedirDesbanear(baneo: Baneo) {
  confirmacion.value = {
    titulo: 'Eliminar baneo',
    mensaje: `¿Eliminar el baneo de ${baneo.nombreObjetivo}? La cuenta podrá volver a usar la plataforma.`,
    boton: 'Eliminar baneo',
    peligro: true,
    ejecutar: async () => {
      try {
        await api.delete(`/moderacion/baneos/${baneo.idBaneoGlobal}`)
        feedback.value = { tipo: 'success', texto: `Se eliminó el baneo de ${baneo.nombreObjetivo}.` }
        await cargarBaneos()
      } catch {
        feedback.value = { tipo: 'danger', texto: 'No se pudo eliminar el baneo.' }
      }
    },
  }
}

async function confirmar() {
  const accion = confirmacion.value
  if (!accion) return
  confirmacion.value = null
  await accion.ejecutar()
}

function cancelarConfirmacion() {
  const accion = confirmacion.value
  confirmacion.value = null
  accion?.alCancelar?.()
}

onMounted(() => cargarBaneos())
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
      titulo="Baneos globales"
      :columnas="columnas"
      :total="baneosFiltrados.length"
      :cargando="cargando"
      :error="error"
      :vacio="mensajeVacio"
      :resumen="resumen"
    >
      <template #barra>
        <div class="pl-admin-barra" role="search" aria-label="Filtros de la tabla">
          <div class="pl-admin-barra__campo">
            <label for="baneos-buscar">Buscar</label>
            <input
              id="baneos-buscar"
              v-model="busqueda"
              type="search"
              class="form-control"
              placeholder="Objetivo, motivo o moderador"
              autocomplete="off"
            />
          </div>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--corto">
            <label for="baneos-tipo">Tipo</label>
            <select id="baneos-tipo" v-model="filtroTipo" class="form-select">
              <option value="">Todos</option>
              <option value="USUARIO">Usuarios</option>
              <option value="PERSONAJE">Personajes</option>
            </select>
          </div>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--corto">
            <label for="baneos-estado">Estado</label>
            <select id="baneos-estado" v-model="filtroEstado" class="form-select">
              <option value="">Todos</option>
              <option value="activos">Activos</option>
              <option value="expirados">Expirados</option>
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
            <button type="button" class="pl-btn pl-btn--danger-ghost pl-btn--sm" @click="abrirFormulario">
              <i class="bi bi-hammer" aria-hidden="true"></i>
              Nuevo baneo
            </button>
          </div>
          <p class="pl-admin-barra__nota">
            Los filtros actúan sobre todos los baneos, que ya vienen completos del servidor.
          </p>
        </div>
      </template>

      <tr v-for="baneo in baneosFiltrados" :key="baneo.idBaneoGlobal">
        <th scope="row">
          <div class="pl-tabla-admin__principal-texto">
            <strong>{{ baneo.nombreObjetivo }}</strong>
            <span class="pl-tabla-admin__secundario">#{{ baneo.idObjetivo }}</span>
          </div>
        </th>
        <td data-etiqueta="Tipo">
          <span class="pl-status-pill pl-status-pill--info">{{ etiquetaTipo(baneo.tipo) }}</span>
        </td>
        <td data-etiqueta="Motivo">
          <span v-if="baneo.motivo" class="pl-tabla-admin__clamp">{{ baneo.motivo }}</span>
          <span v-else class="pl-tabla-admin__secundario">Sin motivo</span>
        </td>
        <td data-etiqueta="Estado">
          <span :class="baneo.activo ? 'pl-status-pill pl-status-pill--danger' : 'pl-status-pill pl-status-pill--neutral'">
            {{ baneo.activo ? 'Activo' : 'Expirado' }}
          </span>
          <span class="pl-tabla-admin__secundario">
            <template v-if="baneo.fechaExpiracion">Hasta {{ fechaLegible(baneo.fechaExpiracion) }}</template>
            <template v-else>Sin vencimiento</template>
          </span>
        </td>
        <td data-etiqueta="Registro">
          <span class="pl-tabla-admin__fecha">{{ fechaLegible(baneo.fechaBaneo) }}</span>
          <span v-if="baneo.baneadoPorNombre" class="pl-tabla-admin__secundario">
            por {{ baneo.baneadoPorNombre }}
          </span>
        </td>
        <td data-etiqueta="Acciones">
          <div class="pl-tabla-admin__acciones">
            <button
              v-if="baneo.activo"
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Desbanear a ${baneo.nombreObjetivo}`"
              @click="pedirDesbanear(baneo)"
            >
              <i class="bi bi-unlock" aria-hidden="true"></i>
              Desbanear
            </button>
            <span v-else class="pl-tabla-admin__secundario">Sin acciones</span>
          </div>
        </td>
      </tr>
    </TablaAdmin>

    <ModalFormulario v-if="formAbierto" titulo="Nuevo baneo global" ancho="md" @cerrar="cerrarFormulario">
      <form ref="formRef" novalidate @submit.prevent="pedirCrear">
        <div class="row g-3">
          <div class="col-12 col-sm-6 pl-field">
            <label class="form-label" for="baneo-tipo">Tipo de objetivo</label>
            <select id="baneo-tipo" v-model="formTipo" class="form-select" @change="cambiarTipo">
              <option value="USUARIO">Usuario</option>
              <option value="PERSONAJE">Personaje</option>
            </select>
          </div>

          <div class="col-12 col-sm-6 pl-field">
            <label class="form-label" for="baneo-id">
              Id del objetivo <span class="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="baneo-id"
              v-model="formIdTexto"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              class="form-control"
              autocomplete="off"
              :aria-invalid="erroresForm.id ? 'true' : undefined"
              :aria-describedby="erroresForm.id ? 'baneo-id-error' : 'baneo-id-ayuda'"
              @input="limpiarError('id')"
            />
            <p v-if="erroresForm.id" id="baneo-id-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresForm.id }}
            </p>
            <p v-else id="baneo-id-ayuda" class="pl-field__hint">
              Lo verás en el perfil o en la ficha del personaje, junto al nombre.
            </p>
          </div>

          <div class="col-12 col-sm-6 pl-field">
            <label class="form-label" for="baneo-duracion">Duración</label>
            <select id="baneo-duracion" v-model="formDuracion" class="form-select">
              <option v-for="opcion in opcionesDuracion" :key="opcion.value" :value="opcion.value">
                {{ opcion.label }}
              </option>
            </select>
          </div>

          <div class="col-12 col-sm-6 pl-field">
            <label class="form-label" for="baneo-motivo">Motivo (opcional)</label>
            <input
              id="baneo-motivo"
              v-model="formMotivo"
              type="text"
              class="form-control"
              maxlength="255"
              autocomplete="off"
              placeholder="Ej: acoso reiterado en el chat"
            />
          </div>
        </div>

        <div class="pl-form-acciones">
          <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarFormulario">Cancelar</button>
          <button type="submit" class="pl-btn pl-btn--danger" :disabled="comprobando">
            <span v-if="comprobando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-hammer" aria-hidden="true"></i>
            {{ comprobando ? 'Comprobando…' : 'Banear' }}
          </button>
        </div>
      </form>
    </ModalFormulario>

    <ModalConfirmacion
      v-if="confirmacion"
      :mensaje="confirmacion.mensaje"
      :titulo="confirmacion.titulo"
      :boton-confirmar="confirmacion.boton"
      :peligro="confirmacion.peligro"
      @confirmar="confirmar"
      @cancelar="cancelarConfirmacion"
    />
  </div>
</template>

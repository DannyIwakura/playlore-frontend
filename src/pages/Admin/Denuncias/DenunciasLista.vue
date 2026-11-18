<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../../services/api'
import PaginadorComponent from '../../../components/PaginadorComponent.vue'
import ModalConfirmacion from '../../../components/ModalConfirmacion.vue'
import ModalFormulario from '../../../components/ModalFormulario.vue'
import TablaAdmin from '../components/TablaAdmin.vue'

interface Denuncia {
  idDenuncia: number
  tipo: 'MENSAJE_CANAL' | 'PERSONAJE' | 'USUARIO' | 'CANAL'
  tipoId: number
  motivo: string
  detalle: string | null
  contenidoDenunciado: string | null
  canalId: number | null
  canalNombre: string | null
  autorPersonajeId: number | null
  autorPersonajeNombre: string | null
  autorUsuarioId: number | null
  autorUsuarioNombre: string | null
  objetivoNombre: string | null
  estado: 'PENDIENTE' | 'RESUELTA' | 'IGNORADA'
  fecha: string
  denuncianteUserId: number
  denuncianteNombre: string
  denunciantePersonajeId: number | null
  denunciantePersonajeNombre: string | null
  resueltoPorNombre: string | null
  decision: string | null
  fechaResolucion: string | null
}

type EstadoDenuncia = Denuncia['estado']

const ESTADOS: Array<{ valor: EstadoDenuncia; etiqueta: string }> = [
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'RESUELTA', etiqueta: 'Resueltas' },
  { valor: 'IGNORADA', etiqueta: 'Ignoradas' },
]

const ETIQUETA_TIPO: Record<string, string> = {
  MENSAJE_CANAL: 'Mensaje de canal',
  PERSONAJE: 'Personaje',
  USUARIO: 'Usuario',
  CANAL: 'Canal',
}

const TAMANIO_PAGINA = 10

const emit = defineEmits<{
  (e: 'moderar-canal', canalId: number): void
}>()

const denuncias = ref<Denuncia[]>([])
const cargando = ref(false)
const error = ref('')
const feedback = ref<{ tipo: 'success' | 'danger'; texto: string } | null>(null)

const paginaActual = ref(0)
const totalPaginas = ref(0)
const totalElementos = ref(0)

const estadoSeleccionado = ref<EstadoDenuncia>('PENDIENTE')
const filtros = ref({
  tipo: '',
  desde: '',
  hasta: '',
  objetivo: '',
  denunciante: '',
  resueltoPor: '',
})

const denunciaDetalle = ref<Denuncia | null>(null)
const notaDecision = ref('')
const resolviendo = ref(false)
const confirmacion = ref<{
  titulo: string
  mensaje: string
  boton: string
  ejecutar: () => Promise<void>
} | null>(null)

const columnas = computed(() => {
  const base = [
    { etiqueta: 'Objetivo' },
    { etiqueta: 'Fecha' },
    { etiqueta: 'Tipo' },
    { etiqueta: 'Motivo' },
    { etiqueta: 'Denunciante' },
  ]
  if (estadoSeleccionado.value !== 'PENDIENTE') base.push({ etiqueta: 'Resultado' })
  base.push({ etiqueta: 'Acciones' })
  return base
})

const hayFiltros = computed(() =>
  Object.values(filtros.value).some((valor) => typeof valor === 'string' && valor.trim() !== '')
)

const resumen = computed(() => {
  const total = totalElementos.value
  const sufijo = estadoSeleccionado.value === 'PENDIENTE'
    ? total === 1 ? 'denuncia pendiente' : 'denuncias pendientes'
    : estadoSeleccionado.value === 'RESUELTA'
      ? total === 1 ? 'denuncia resuelta' : 'denuncias resueltas'
      : total === 1 ? 'denuncia ignorada' : 'denuncias ignoradas'
  return `${total} ${sufijo}${hayFiltros.value ? ' con filtros' : ''}`
})

const mensajeVacio = computed(() => {
  const sufijo = estadoSeleccionado.value === 'PENDIENTE'
    ? 'pendientes'
    : estadoSeleccionado.value === 'RESUELTA'
      ? 'resueltas'
      : 'ignoradas'
  return `No hay denuncias ${sufijo}.${hayFiltros.value ? ' Revisa los filtros aplicados.' : ''}`
})

const objetivoBaneo = computed(() => {
  const denuncia = denunciaDetalle.value
  if (!denuncia) return null
  if (denuncia.tipo === 'USUARIO') {
    return { id: denuncia.tipoId, nombre: denuncia.objetivoNombre || `#${denuncia.tipoId}` }
  }
  if (denuncia.tipo === 'PERSONAJE' && denuncia.autorUsuarioId) {
    return {
      id: denuncia.autorUsuarioId,
      nombre: denuncia.autorUsuarioNombre || `#${denuncia.autorUsuarioId}`,
    }
  }
  return null
})

// Canal al que se puede saltar desde el detalle: las denuncias de mensaje
// traen canalId y las denuncias de canal usan tipoId.
const canalDenunciadoId = computed<number | null>(() => {
  const denuncia = denunciaDetalle.value
  if (!denuncia) return null
  if (denuncia.canalId != null) return denuncia.canalId
  if (denuncia.tipo === 'CANAL') return denuncia.tipoId
  return null
})

function fechaLegible(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function nombreObjetivo(denuncia: Denuncia): string {
  return denuncia.objetivoNombre || denuncia.autorPersonajeNombre || `#${denuncia.tipoId}`
}

function rutaObjetivo(denuncia: Denuncia): string {
  if (denuncia.tipo === 'USUARIO') return `/perfil/${denuncia.tipoId}`
  if (denuncia.tipo === 'CANAL') return '/chat'
  return `/personaje/${denuncia.tipoId}`
}

function claseEstado(estado: EstadoDenuncia): string {
  if (estado === 'PENDIENTE') return 'pl-status-pill pl-status-pill--warning'
  if (estado === 'RESUELTA') return 'pl-status-pill'
  return 'pl-status-pill pl-status-pill--neutral'
}

async function cargarDenuncias(pagina = 0) {
  cargando.value = true
  error.value = ''
  try {
    const params: Record<string, string | number> = {
      estado: estadoSeleccionado.value,
      page: pagina,
      size: TAMANIO_PAGINA,
    }
    if (filtros.value.tipo) params.tipo = filtros.value.tipo
    if (filtros.value.desde) params.desde = filtros.value.desde
    if (filtros.value.hasta) params.hasta = filtros.value.hasta
    if (filtros.value.objetivo.trim()) params.objetivo = filtros.value.objetivo.trim()
    if (filtros.value.denunciante.trim()) params.denunciante = filtros.value.denunciante.trim()
    if (estadoSeleccionado.value !== 'PENDIENTE' && filtros.value.resueltoPor.trim()) {
      params.resueltoPor = filtros.value.resueltoPor.trim()
    }

    const { data } = await api.get('/denuncias', { params })
    denuncias.value = data.content ?? []
    totalPaginas.value = data.totalPages ?? 0
    totalElementos.value = data.totalElements ?? denuncias.value.length
    paginaActual.value = data.number ?? 0
  } catch {
    denuncias.value = []
    error.value = 'Error al cargar las denuncias.'
  } finally {
    cargando.value = false
  }
}

function cambiarEstado(estado: EstadoDenuncia) {
  if (estado === estadoSeleccionado.value) return
  estadoSeleccionado.value = estado
  cargarDenuncias(0)
}

function aplicarFiltros() {
  cargarDenuncias(0)
}

function limpiarFiltros() {
  filtros.value = { tipo: '', desde: '', hasta: '', objetivo: '', denunciante: '', resueltoPor: '' }
  cargarDenuncias(0)
}

function abrirDetalle(denuncia: Denuncia) {
  denunciaDetalle.value = denuncia
  notaDecision.value = denuncia.tipo === 'MENSAJE_CANAL' ? 'Mensaje retirado del canal.' : ''
}

function cerrarDetalle() {
  denunciaDetalle.value = null
  notaDecision.value = ''
}

function moderarCanal() {
  const canalId = canalDenunciadoId.value
  if (canalId == null) return
  cerrarDetalle()
  emit('moderar-canal', canalId)
}

async function resolver() {
  const denuncia = denunciaDetalle.value
  if (!denuncia || resolviendo.value) return
  resolviendo.value = true
  try {
    await api.put(`/denuncias/${denuncia.idDenuncia}/resolver`, {
      estado: 'RESUELTA',
      decision: notaDecision.value.trim() || null,
    })
    cerrarDetalle()
    feedback.value = { tipo: 'success', texto: `Se resolvió la denuncia #${denuncia.idDenuncia}.` }
    await cargarDenuncias(paginaActual.value)
  } catch {
    feedback.value = { tipo: 'danger', texto: 'No se pudo resolver la denuncia.' }
  } finally {
    resolviendo.value = false
  }
}

function pedirIgnorar() {
  const denuncia = denunciaDetalle.value
  if (!denuncia) return
  confirmacion.value = {
    titulo: 'Ignorar denuncia',
    mensaje: `¿Marcar la denuncia #${denuncia.idDenuncia} como ignorada?`,
    boton: 'Ignorar',
    ejecutar: async () => {
      resolviendo.value = true
      try {
        await api.put(`/denuncias/${denuncia.idDenuncia}/resolver`, {
          estado: 'IGNORADA',
          decision: null,
        })
        cerrarDetalle()
        feedback.value = { tipo: 'success', texto: `Se ignoró la denuncia #${denuncia.idDenuncia}.` }
        await cargarDenuncias(paginaActual.value)
      } catch {
        feedback.value = { tipo: 'danger', texto: 'No se pudo ignorar la denuncia.' }
      } finally {
        resolviendo.value = false
      }
    },
  }
}

function pedirBanear() {
  const denuncia = denunciaDetalle.value
  const objetivo = objetivoBaneo.value
  if (!denuncia || !objetivo) return
  confirmacion.value = {
    titulo: 'Banear objetivo',
    mensaje: `¿Banear de forma permanente a ${objetivo.nombre} por la denuncia #${denuncia.idDenuncia}?`,
    boton: 'Banear',
    ejecutar: async () => {
      resolviendo.value = true
      try {
        await api.post('/moderacion/baneos', {
          tipo: 'USUARIO',
          id: objetivo.id,
          duracion: 'PERMANENTE',
          motivo: `Baneado por denuncia #${denuncia.idDenuncia}: ${denuncia.motivo}`.slice(0, 255),
        })
        cerrarDetalle()
        feedback.value = { tipo: 'success', texto: `Se baneó a ${objetivo.nombre}.` }
        await cargarDenuncias(paginaActual.value)
      } catch (e: any) {
        feedback.value = {
          tipo: 'danger',
          texto: e?.response?.data?.error || 'No se pudo banear al usuario.',
        }
      } finally {
        resolviendo.value = false
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

onMounted(() => cargarDenuncias())
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
      titulo="Denuncias de la comunidad"
      :columnas="columnas"
      :total="denuncias.length"
      :cargando="cargando"
      :error="error"
      :vacio="mensajeVacio"
      :resumen="resumen"
    >
      <template #barra>
        <div class="pl-admin-barra" role="search" aria-label="Filtros de la tabla">
          <fieldset class="pl-segmentado">
            <legend class="visually-hidden">Estado de las denuncias</legend>
            <label v-for="opcion in ESTADOS" :key="opcion.valor" class="pl-segmentado__opcion">
              <input
                class="visually-hidden"
                type="radio"
                name="denuncias-estado"
                :value="opcion.valor"
                :checked="estadoSeleccionado === opcion.valor"
                @change="cambiarEstado(opcion.valor)"
              />
              <span>{{ opcion.etiqueta }}</span>
            </label>
          </fieldset>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--corto">
            <label for="denuncias-tipo">Tipo</label>
            <select id="denuncias-tipo" v-model="filtros.tipo" class="form-select" @change="aplicarFiltros">
              <option value="">Todos</option>
              <option v-for="(etiqueta, valor) in ETIQUETA_TIPO" :key="valor" :value="valor">
                {{ etiqueta }}
              </option>
            </select>
          </div>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--fecha">
            <label for="denuncias-desde">Desde</label>
            <input id="denuncias-desde" v-model="filtros.desde" type="date" class="form-control" @change="aplicarFiltros" />
          </div>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--fecha">
            <label for="denuncias-hasta">Hasta</label>
            <input id="denuncias-hasta" v-model="filtros.hasta" type="date" class="form-control" @change="aplicarFiltros" />
          </div>
          <div class="pl-admin-barra__campo">
            <label for="denuncias-objetivo">Objetivo</label>
            <input
              id="denuncias-objetivo"
              v-model="filtros.objetivo"
              type="text"
              class="form-control"
              placeholder="Nombre del reportado"
              @change="aplicarFiltros"
              @keyup.enter="aplicarFiltros"
            />
          </div>
          <div class="pl-admin-barra__campo">
            <label for="denuncias-denunciante">Denunciante</label>
            <input
              id="denuncias-denunciante"
              v-model="filtros.denunciante"
              type="text"
              class="form-control"
              placeholder="Nombre del que reporta"
              @change="aplicarFiltros"
              @keyup.enter="aplicarFiltros"
            />
          </div>
          <div v-if="estadoSeleccionado !== 'PENDIENTE'" class="pl-admin-barra__campo">
            <label for="denuncias-resuelto">Resuelto por</label>
            <input
              id="denuncias-resuelto"
              v-model="filtros.resueltoPor"
              type="text"
              class="form-control"
              placeholder="Moderador"
              @change="aplicarFiltros"
              @keyup.enter="aplicarFiltros"
            />
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
          </div>
          <p class="pl-admin-barra__nota">
            Los filtros se aplican en el servidor sobre todas las denuncias, no solo sobre esta página.
          </p>
        </div>
      </template>

      <tr v-for="denuncia in denuncias" :key="denuncia.idDenuncia">
        <th scope="row">
          <div v-if="denuncia.tipo === 'MENSAJE_CANAL'">
            <div
              v-if="denuncia.contenidoDenunciado"
              class="pl-tabla-admin__clamp"
              v-sanitize="denuncia.contenidoDenunciado"
            ></div>
            <span v-else class="pl-tabla-admin__secundario">Mensaje sin contenido disponible</span>
            <span class="pl-tabla-admin__secundario">
              Autor: {{ denuncia.autorPersonajeNombre ?? nombreObjetivo(denuncia) }}
              <template v-if="denuncia.canalNombre"> · {{ denuncia.canalNombre }}</template>
              <template v-else-if="denuncia.canalId"> · Canal #{{ denuncia.canalId }}</template>
            </span>
          </div>
          <div v-else>
            <router-link :to="rutaObjetivo(denuncia)">
              <strong>{{ nombreObjetivo(denuncia) }}</strong>
            </router-link>
            <span
              v-if="denuncia.tipo === 'PERSONAJE' && denuncia.autorUsuarioNombre"
              class="pl-tabla-admin__secundario"
            >
              Cuenta:
              <router-link :to="`/perfil/${denuncia.autorUsuarioId}`">{{ denuncia.autorUsuarioNombre }}</router-link>
            </span>
          </div>
        </th>
        <td data-etiqueta="Fecha" class="pl-tabla-admin__fecha">{{ fechaLegible(denuncia.fecha) }}</td>
        <td data-etiqueta="Tipo">
          <span class="pl-status-pill pl-status-pill--info">
            {{ ETIQUETA_TIPO[denuncia.tipo] ?? denuncia.tipo }}
          </span>
        </td>
        <td data-etiqueta="Motivo">
          <div class="pl-tabla-admin__clamp">{{ denuncia.motivo }}</div>
          <span v-if="denuncia.detalle" class="pl-tabla-admin__secundario">{{ denuncia.detalle }}</span>
        </td>
        <td data-etiqueta="Denunciante">
          <span>{{ denuncia.denuncianteNombre }}</span>
          <span v-if="denuncia.denunciantePersonajeNombre" class="pl-tabla-admin__secundario">
            ({{ denuncia.denunciantePersonajeNombre }})
          </span>
        </td>
        <td v-if="estadoSeleccionado !== 'PENDIENTE'" data-etiqueta="Resultado">
          <span :class="claseEstado(denuncia.estado)">{{ denuncia.estado }}</span>
          <span v-if="denuncia.decision" class="pl-tabla-admin__secundario">{{ denuncia.decision }}</span>
          <span v-if="denuncia.resueltoPorNombre" class="pl-tabla-admin__secundario">
            por {{ denuncia.resueltoPorNombre }}
          </span>
        </td>
        <td data-etiqueta="Acciones">
          <div class="pl-tabla-admin__acciones">
            <button
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Ver el detalle de la denuncia ${denuncia.idDenuncia}`"
              @click="abrirDetalle(denuncia)"
            >
              <i class="bi bi-eye" aria-hidden="true"></i>
              Ver detalle
            </button>
          </div>
        </td>
      </tr>

      <template #pie>
        <PaginadorComponent
          :paginaActual="paginaActual"
          :totalPaginas="totalPaginas"
          @cambiar="cargarDenuncias"
        />
      </template>
    </TablaAdmin>

    <ModalFormulario
      v-if="denunciaDetalle"
      :titulo="`Denuncia #${denunciaDetalle.idDenuncia}`"
      ancho="md"
      @cerrar="cerrarDetalle"
    >
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span class="pl-status-pill pl-status-pill--info">
          {{ ETIQUETA_TIPO[denunciaDetalle.tipo] }}
        </span>
        <span :class="claseEstado(denunciaDetalle.estado)">{{ denunciaDetalle.estado }}</span>
        <span class="pl-tabla-admin__secundario">
          <i class="bi bi-calendar3" aria-hidden="true"></i>
          {{ fechaLegible(denunciaDetalle.fecha) }}
        </span>
      </div>

      <section class="pl-denuncia__bloque" aria-labelledby="denuncia-reportado">
        <h3 id="denuncia-reportado" class="pl-denuncia__titulo">Reportado</h3>
        <div v-if="denunciaDetalle.tipo === 'MENSAJE_CANAL'" class="pl-denuncia__caja">
          <div class="pl-denuncia__mensaje" v-sanitize="denunciaDetalle.contenidoDenunciado"></div>
          <p class="mb-1">
            <i class="bi bi-hash" aria-hidden="true"></i>
            Canal: <strong>{{ denunciaDetalle.canalNombre || `#${denunciaDetalle.canalId}` }}</strong>
          </p>
          <p class="mb-1">
            <i class="bi bi-person-badge" aria-hidden="true"></i>
            Personaje:
            <router-link
              v-if="denunciaDetalle.autorPersonajeId"
              :to="`/personaje/${denunciaDetalle.autorPersonajeId}`"
            >
              {{ denunciaDetalle.autorPersonajeNombre || nombreObjetivo(denunciaDetalle) }}
            </router-link>
            <strong v-else>{{ denunciaDetalle.autorPersonajeNombre || nombreObjetivo(denunciaDetalle) }}</strong>
          </p>
          <p v-if="denunciaDetalle.autorUsuarioId" class="mb-0">
            <i class="bi bi-person" aria-hidden="true"></i>
            Cuenta:
            <router-link :to="`/perfil/${denunciaDetalle.autorUsuarioId}`">
              {{ denunciaDetalle.autorUsuarioNombre || `#${denunciaDetalle.autorUsuarioId}` }}
            </router-link>
          </p>
        </div>
        <div v-else class="pl-denuncia__caja">
          <p class="mb-1">
            <i
              class="bi"
              :class="denunciaDetalle.tipo === 'USUARIO' ? 'bi-person' : denunciaDetalle.tipo === 'CANAL' ? 'bi-hash' : 'bi-person-badge'"
              aria-hidden="true"
            ></i>
            {{ denunciaDetalle.tipo === 'USUARIO' ? 'Usuario' : denunciaDetalle.tipo === 'CANAL' ? 'Canal' : 'Personaje' }}:
            <router-link :to="rutaObjetivo(denunciaDetalle)">
              {{ nombreObjetivo(denunciaDetalle) }}
            </router-link>
          </p>
          <p v-if="denunciaDetalle.tipo === 'PERSONAJE' && denunciaDetalle.autorUsuarioId" class="mb-0">
            <i class="bi bi-person" aria-hidden="true"></i>
            Cuenta:
            <router-link :to="`/perfil/${denunciaDetalle.autorUsuarioId}`">
              {{ denunciaDetalle.autorUsuarioNombre || `#${denunciaDetalle.autorUsuarioId}` }}
            </router-link>
          </p>
        </div>

        <button
          v-if="canalDenunciadoId !== null"
          type="button"
          class="pl-btn pl-btn--secondary pl-btn--sm mt-2"
          @click="moderarCanal"
        >
          <i class="bi bi-shield-exclamation" aria-hidden="true"></i>
          Moderar canal
        </button>
      </section>

      <section class="pl-denuncia__bloque" aria-labelledby="denuncia-motivo">
        <h3 id="denuncia-motivo" class="pl-denuncia__titulo">Motivo</h3>
        <div class="pl-denuncia__caja">{{ denunciaDetalle.motivo }}</div>
        <div v-if="denunciaDetalle.detalle" class="pl-denuncia__caja pl-denuncia__detalle">
          {{ denunciaDetalle.detalle }}
        </div>
      </section>

      <section class="pl-denuncia__bloque" aria-labelledby="denuncia-denunciante">
        <h3 id="denuncia-denunciante" class="pl-denuncia__titulo">Denunciante</h3>
        <div class="pl-denuncia__caja">
          <router-link :to="`/perfil/${denunciaDetalle.denuncianteUserId}`">
            {{ denunciaDetalle.denuncianteNombre }}
          </router-link>
          <span v-if="denunciaDetalle.denunciantePersonajeNombre" class="pl-tabla-admin__secundario">
            ({{ denunciaDetalle.denunciantePersonajeNombre }})
          </span>
        </div>
      </section>

      <section
        v-if="denunciaDetalle.estado !== 'PENDIENTE'"
        class="pl-denuncia__bloque"
        aria-labelledby="denuncia-resolucion"
      >
        <h3 id="denuncia-resolucion" class="pl-denuncia__titulo">Resolución</h3>
        <div class="pl-denuncia__caja">
          <p v-if="denunciaDetalle.decision" class="mb-1">{{ denunciaDetalle.decision }}</p>
          <p v-else class="mb-1 text-muted fst-italic">Sin nota.</p>
          <p class="mb-0 pl-tabla-admin__secundario">
            {{ denunciaDetalle.resueltoPorNombre ? `por ${denunciaDetalle.resueltoPorNombre}` : '' }}
            {{ denunciaDetalle.fechaResolucion ? '· ' + fechaLegible(denunciaDetalle.fechaResolucion) : '' }}
          </p>
        </div>
      </section>

      <template v-if="denunciaDetalle.estado === 'PENDIENTE'">
        <div class="pl-field">
          <label class="form-label" for="denuncia-nota">Nota de la resolución (opcional)</label>
          <textarea
            id="denuncia-nota"
            v-model="notaDecision"
            class="form-control"
            rows="2"
            maxlength="255"
            placeholder="Ej: mensaje retirado, advertencia al usuario..."
          ></textarea>
        </div>

        <div class="pl-form-acciones pl-denuncia__acciones">
          <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarDetalle">Cerrar</button>
          <button
            v-if="objetivoBaneo"
            type="button"
            class="pl-btn pl-btn--danger-ghost"
            :disabled="resolviendo"
            @click="pedirBanear"
          >
            <i class="bi bi-person-x" aria-hidden="true"></i>
            Banear objetivo
          </button>
          <button
            type="button"
            class="pl-btn pl-btn--secondary"
            :disabled="resolviendo"
            @click="pedirIgnorar"
          >
            <i class="bi bi-x-circle" aria-hidden="true"></i>
            Ignorar
          </button>
          <button type="button" class="pl-btn pl-btn--success" :disabled="resolviendo" @click="resolver">
            <span v-if="resolviendo" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-check-circle" aria-hidden="true"></i>
            Resolver
          </button>
        </div>
      </template>
    </ModalFormulario>

    <ModalConfirmacion
      v-if="confirmacion"
      :mensaje="confirmacion.mensaje"
      :titulo="confirmacion.titulo"
      :boton-confirmar="confirmacion.boton"
      :peligro="true"
      @confirmar="confirmar"
      @cancelar="confirmacion = null"
    />
  </div>
</template>

<style scoped>
.pl-denuncia__bloque {
  margin-bottom: 1rem;
}

.pl-denuncia__titulo {
  margin: 0 0 0.35rem;
  color: var(--pl-muted);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.pl-denuncia__caja {
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface-soft);
}

.pl-denuncia__caja + .pl-denuncia__caja {
  margin-top: 0.5rem;
}

.pl-denuncia__detalle {
  white-space: pre-wrap;
}

.pl-denuncia__mensaje {
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 0.5rem;
  overflow-wrap: anywhere;
}

.pl-denuncia__mensaje :deep(p) {
  margin-bottom: 0.5rem;
}

.pl-denuncia__acciones {
  margin-top: 0;
}
</style>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import axios from '../../../services/api'
import PaginadorComponent from '../../../components/PaginadorComponent.vue'
import ModalAviso from '../../../components/ModalAviso.vue'
import ModalConfirmacion from '../../../components/ModalConfirmacion.vue'

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

const denuncias = ref<Denuncia[]>([])
const cargando = ref(false)
const error = ref('')

const paginaActual = ref(0)
const totalPaginas = ref(0)
const size = 10

const estadoSeleccionado = ref<'PENDIENTE' | 'RESUELTA' | 'IGNORADA'>('PENDIENTE')

const filtros = ref({
  tipo: '',
  desde: '',
  hasta: '',
  objetivo: '',
  denunciante: '',
  resueltoPor: '',
})

const hayFiltros = () =>
  Object.values(filtros.value).some(v => typeof v === 'string' && v.trim() !== '')

const aplicarFiltros = () => cargarDenuncias(0)

const limpiarFiltros = () => {
  filtros.value = { tipo: '', desde: '', hasta: '', objetivo: '', denunciante: '', resueltoPor: '' }
  cargarDenuncias(0)
}

const ETIQUETA_TIPO: Record<string, string> = {
  MENSAJE_CANAL: 'Mensaje de canal',
  PERSONAJE: 'Personaje',
  USUARIO: 'Usuario',
  CANAL: 'Canal',
}

// --- Modal de detalle ---
const denunciaDetalle = ref<Denuncia | null>(null)
const notaDecision = ref('')
const resolviendo = ref(false)
const aviso = ref<string | null>(null)
const confirmacion = ref<{ mensaje: string; ejecutar: () => void } | null>(null)

function abrirDetalle(d: Denuncia) {
  denunciaDetalle.value = d
  notaDecision.value = d.tipo === 'MENSAJE_CANAL' ? 'Mensaje retirado del canal.' : ''
}

const cerrarDetalle = () => {
  denunciaDetalle.value = null
  notaDecision.value = ''
}

const resolver = async () => {
  const d = denunciaDetalle.value
  if (!d) return
  resolviendo.value = true
  try {
    await axios.put(`/denuncias/${d.idDenuncia}/resolver`, {
      estado: 'RESUELTA',
      decision: notaDecision.value.trim() || null,
    })
    cerrarDetalle()
    await cargarDenuncias(paginaActual.value)
  } catch (e) {
    aviso.value = 'Error al resolver la denuncia.'
  } finally {
    resolviendo.value = false
  }
}

const ignorar = () => {
  const d = denunciaDetalle.value
  if (!d) return
  confirmacion.value = {
    mensaje: '¿Marcar esta denuncia como ignorada?',
    ejecutar: async () => {
      resolviendo.value = true
      try {
        await axios.put(`/denuncias/${d.idDenuncia}/resolver`, {
          estado: 'IGNORADA',
          decision: null,
        })
        cerrarDetalle()
        await cargarDenuncias(paginaActual.value)
      } catch (e) {
        aviso.value = 'Error al ignorar la denuncia.'
      } finally {
        resolviendo.value = false
      }
    },
  }
}

const cargarDenuncias = async (pagina = 0) => {
  cargando.value = true
  error.value = ''
  try {
    const params: Record<string, unknown> = { estado: estadoSeleccionado.value, page: pagina, size }
    if (filtros.value.tipo) params.tipo = filtros.value.tipo
    if (filtros.value.desde) params.desde = filtros.value.desde
    if (filtros.value.hasta) params.hasta = filtros.value.hasta
    if (filtros.value.objetivo.trim()) params.objetivo = filtros.value.objetivo.trim()
    if (filtros.value.denunciante.trim()) params.denunciante = filtros.value.denunciante.trim()
    if (estadoSeleccionado.value !== 'PENDIENTE' && filtros.value.resueltoPor.trim()) {
      params.resueltoPor = filtros.value.resueltoPor.trim()
    }
    const { data } = await axios.get('/denuncias', { params })
    denuncias.value = data.content
    totalPaginas.value = data.totalPages
    paginaActual.value = data.number
    await nextTick()
    comprobarTruncados()
  } catch (e) {
    error.value = 'Error al cargar las denuncias.'
  } finally {
    cargando.value = false
  }
}

const cambiarEstado = (estado: 'PENDIENTE' | 'RESUELTA' | 'IGNORADA') => {
  estadoSeleccionado.value = estado
  cargarDenuncias(0)
}

const fechaLegible = (f: string | null) => {
  if (!f) return '—'
  return new Date(f).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

const nombreObjetivo = (d: Denuncia) =>
  d.objetivoNombre || d.autorPersonajeNombre || `#${d.tipoId}`

const rutaObjetivo = (d: Denuncia) =>
  d.tipo === 'USUARIO' ? `/perfil/${d.tipoId}` : d.tipo === 'CANAL' ? '/chat' : `/personaje/${d.tipoId}`

// --- Recorte de mensajes largos en la tabla ---
const contenedoresMensaje = new Map<number, HTMLElement>()
const truncados = ref<Set<number>>(new Set())

const guardarRef = (id: number, el: unknown) => {
  if (el) contenedoresMensaje.set(id, el as HTMLElement)
  else contenedoresMensaje.delete(id)
}

const comprobarTruncados = () => {
  const nuevos = new Set<number>()
  contenedoresMensaje.forEach((el, id) => {
    if (el.scrollHeight > el.clientHeight) nuevos.add(id)
  })
  truncados.value = nuevos
}

const manejarResize = () => comprobarTruncados()

onMounted(() => {
  window.addEventListener('resize', manejarResize)
  cargarDenuncias()
})
onBeforeUnmount(() => window.removeEventListener('resize', manejarResize))
</script>

<template>
  <div>
    <!-- Filtro por estado -->
    <div class="btn-group mb-3" role="group">
      <button
        class="btn btn-sm"
        :class="estadoSeleccionado === 'PENDIENTE' ? 'btn-warning' : 'btn-outline-secondary'"
        @click="cambiarEstado('PENDIENTE')"
      >
        Pendientes
      </button>
      <button
        class="btn btn-sm"
        :class="estadoSeleccionado === 'RESUELTA' ? 'btn-success' : 'btn-outline-secondary'"
        @click="cambiarEstado('RESUELTA')"
      >
        Resueltas
      </button>
      <button
        class="btn btn-sm"
        :class="estadoSeleccionado === 'IGNORADA' ? 'btn-secondary' : 'btn-outline-secondary'"
        @click="cambiarEstado('IGNORADA')"
      >
        Ignoradas
      </button>
    </div>

    <div class="card mb-3">
      <div class="card-body py-3">
        <div class="row g-2 align-items-end">
          <div class="col-auto">
            <label class="form-label small text-muted mb-1">Tipo</label>
            <select v-model="filtros.tipo" class="form-select form-select-sm" @change="aplicarFiltros">
              <option value="">Todos</option>
              <option v-for="(etiqueta, valor) in ETIQUETA_TIPO" :key="valor" :value="valor">{{ etiqueta }}</option>
            </select>
          </div>
          <div class="col-auto">
            <label class="form-label small text-muted mb-1">Desde</label>
            <input v-model="filtros.desde" type="date" class="form-control form-control-sm" @change="aplicarFiltros" />
          </div>
          <div class="col-auto">
            <label class="form-label small text-muted mb-1">Hasta</label>
            <input v-model="filtros.hasta" type="date" class="form-control form-control-sm" @change="aplicarFiltros" />
          </div>
          <div class="col-auto">
            <label class="form-label small text-muted mb-1">Objetivo</label>
            <input
              v-model="filtros.objetivo"
              type="text"
              class="form-control form-control-sm"
              placeholder="Nombre del reportado"
              @change="aplicarFiltros"
              @keyup.enter="aplicarFiltros"
            />
          </div>
          <div class="col-auto">
            <label class="form-label small text-muted mb-1">Denunciante</label>
            <input
              v-model="filtros.denunciante"
              type="text"
              class="form-control form-control-sm"
              placeholder="Nombre del que reporta"
              @change="aplicarFiltros"
              @keyup.enter="aplicarFiltros"
            />
          </div>
          <div v-if="estadoSeleccionado !== 'PENDIENTE'" class="col-auto">
            <label class="form-label small text-muted mb-1">Resuelto por</label>
            <input
              v-model="filtros.resueltoPor"
              type="text"
              class="form-control form-control-sm"
              placeholder="Moderador"
              @change="aplicarFiltros"
              @keyup.enter="aplicarFiltros"
            />
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-outline-secondary" @click="limpiarFiltros" :disabled="!hayFiltros()">
              <i class="bi bi-eraser me-1"></i>Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="cargando" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead class="table-dark">
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Contenido / Objetivo</th>
              <th>Motivo</th>
              <th>Denunciante</th>
              <th v-if="estadoSeleccionado !== 'PENDIENTE'">Resultado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="denuncias.length === 0">
              <td colspan="7" class="text-center text-muted py-4">
                No hay denuncias {{ estadoSeleccionado === 'PENDIENTE' ? 'pendientes' : '' }}.
                <template v-if="hayFiltros()"> Revisa los filtros aplicados.</template>
              </td>
            </tr>
            <tr v-for="d in denuncias" :key="d.idDenuncia">
              <td style="white-space: nowrap">
                <span style="font-size: 0.85rem">{{ fechaLegible(d.fecha) }}</span>
              </td>
              <td>
                <span class="badge bg-info text-dark">{{ ETIQUETA_TIPO[d.tipo] ?? d.tipo }}</span>
              </td>
              <td style="max-width: 320px">
                <div v-if="d.tipo === 'MENSAJE_CANAL'">
                  <div v-if="d.contenidoDenunciado" class="border rounded p-2 bg-light">
                    <div
                      :ref="el => guardarRef(d.idDenuncia, el)"
                      class="preview-clamp"
                      v-sanitize="d.contenidoDenunciado"
                    ></div>
                    <a
                      v-if="truncados.has(d.idDenuncia)"
                      href="#"
                      class="small text-decoration-none"
                      @click.prevent="abrirDetalle(d)"
                    >
                      Ver más
                    </a>
                  </div>
                  <div class="text-muted" style="font-size: 0.8rem">
                    Autor: <strong>{{ d.autorPersonajeNombre ?? nombreObjetivo(d) }}</strong>
                    <template v-if="d.canalNombre"> · {{ d.canalNombre }}</template>
                    <template v-else-if="d.canalId"> · Canal #{{ d.canalId }}</template>
                  </div>
                </div>
                <div v-else>
                  <router-link :to="rutaObjetivo(d)" class="text-decoration-none">
                    <strong>{{ nombreObjetivo(d) }}</strong>
                  </router-link>
                  <template v-if="d.tipo === 'PERSONAJE' && d.autorUsuarioNombre">
                    <span class="text-muted" style="font-size: 0.8rem">
                      · cuenta: <router-link :to="`/perfil/${d.autorUsuarioId}`" class="text-decoration-none">{{ d.autorUsuarioNombre }}</router-link>
                    </span>
                  </template>
                </div>
              </td>
              <td style="max-width: 220px">
                <div>{{ d.motivo }}</div>
                <div v-if="d.detalle" class="text-muted" style="font-size: 0.8rem">
                  {{ d.detalle }}
                </div>
              </td>
              <td>
                <span>{{ d.denuncianteNombre }}</span>
                <span
                  v-if="d.denunciantePersonajeNombre"
                  class="text-muted d-block"
                  style="font-size: 0.8rem"
                >
                  ({{ d.denunciantePersonajeNombre }})
                </span>
              </td>
              <td v-if="estadoSeleccionado !== 'PENDIENTE'">
                <span
                  class="badge"
                  :class="d.estado === 'RESUELTA' ? 'bg-success' : 'bg-secondary'"
                >
                  {{ d.estado }}
                </span>
                <div v-if="d.decision" class="text-muted" style="font-size: 0.8rem">
                  {{ d.decision }}
                </div>
                <div v-if="d.resueltoPorNombre" class="text-muted" style="font-size: 0.8rem">
                  por {{ d.resueltoPorNombre }}
                </div>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary" @click="abrirDetalle(d)" title="Ver detalle">
                  <i class="bi bi-eye"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginadorComponent
          :paginaActual="paginaActual"
          :totalPaginas="totalPaginas"
          @cambiar="cargarDenuncias"
        />
      </div>
    </div>
  </div>

  <!-- Modal: Detalle de la denuncia -->
  <div v-if="denunciaDetalle" class="modal-backdrop-custom" @click.self="cerrarDetalle">
    <div class="modal-content-custom shadow-lg rounded-3 p-4" style="max-width: 560px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">
          <span class="badge bg-info text-dark me-2">{{ ETIQUETA_TIPO[denunciaDetalle.tipo] }}</span>
          Denuncia #{{ denunciaDetalle.idDenuncia }}
        </h5>
        <button class="btn-close" @click="cerrarDetalle"></button>
      </div>

      <div class="small text-muted mb-3">
        <i class="bi bi-calendar3 me-1"></i> {{ fechaLegible(denunciaDetalle.fecha) }}
        <span v-if="denunciaDetalle.estado !== 'PENDIENTE'" class="ms-3">
          <span class="badge" :class="denunciaDetalle.estado === 'RESUELTA' ? 'bg-success' : 'bg-secondary'">
            {{ denunciaDetalle.estado }}
          </span>
        </span>
      </div>

      <!-- Objetivo reportado -->
      <div class="mb-3">
        <label class="form-label fw-semibold">Reportado</label>
        <div v-if="denunciaDetalle.tipo === 'MENSAJE_CANAL'" class="border rounded p-2 bg-light">
          <div class="mensaje-modal" v-sanitize="denunciaDetalle.contenidoDenunciado"></div>
          <div class="small">
            <i class="bi bi-hash me-1"></i> Canal:
            <strong>{{ denunciaDetalle.canalNombre || `#${denunciaDetalle.canalId}` }}</strong>
          </div>
          <div class="small">
            <i class="bi bi-person-badge me-1"></i> Personaje:
            <router-link
              v-if="denunciaDetalle.autorPersonajeId"
              :to="`/personaje/${denunciaDetalle.autorPersonajeId}`"
              class="text-decoration-none"
            >
              <strong>{{ denunciaDetalle.autorPersonajeNombre || nombreObjetivo(denunciaDetalle) }}</strong>
            </router-link>
            <strong v-else>{{ denunciaDetalle.autorPersonajeNombre || nombreObjetivo(denunciaDetalle) }}</strong>
          </div>
          <div v-if="denunciaDetalle.autorUsuarioId" class="small">
            <i class="bi bi-person me-1"></i> Cuenta:
            <router-link :to="`/perfil/${denunciaDetalle.autorUsuarioId}`" class="text-decoration-none">
              <strong>{{ denunciaDetalle.autorUsuarioNombre || `#${denunciaDetalle.autorUsuarioId}` }}</strong>
            </router-link>
          </div>
        </div>
        <div v-else-if="denunciaDetalle.tipo === 'CANAL'" class="border rounded p-3 bg-light">
          <div class="small">
            <i class="bi bi-hash me-1"></i> Canal:
            <router-link to="/chat" class="text-decoration-none">
              <strong>{{ nombreObjetivo(denunciaDetalle) }}</strong>
            </router-link>
          </div>
        </div>
        <div v-else class="border rounded p-3 bg-light">
          <div class="small">
            <i class="bi me-1" :class="denunciaDetalle.tipo === 'USUARIO' ? 'bi-person' : 'bi-person-badge'"></i>
            {{ denunciaDetalle.tipo === 'USUARIO' ? 'Usuario' : 'Personaje' }}:
            <router-link :to="rutaObjetivo(denunciaDetalle)" class="text-decoration-none">
              <strong>{{ nombreObjetivo(denunciaDetalle) }}</strong>
            </router-link>
          </div>
          <div v-if="denunciaDetalle.tipo === 'PERSONAJE' && denunciaDetalle.autorUsuarioId" class="small">
            <i class="bi bi-person me-1"></i> Cuenta:
            <router-link :to="`/perfil/${denunciaDetalle.autorUsuarioId}`" class="text-decoration-none">
              <strong>{{ denunciaDetalle.autorUsuarioNombre || `#${denunciaDetalle.autorUsuarioId}` }}</strong>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Motivo y detalle -->
      <div class="mb-3">
        <label class="form-label fw-semibold">Motivo</label>
        <div class="border rounded p-2">{{ denunciaDetalle.motivo }}</div>
      </div>
      <div v-if="denunciaDetalle.detalle" class="mb-3">
        <label class="form-label fw-semibold">Detalle</label>
        <div class="border rounded p-2" style="white-space: pre-wrap">{{ denunciaDetalle.detalle }}</div>
      </div>

      <!-- Denunciante -->
      <div class="mb-3">
        <label class="form-label fw-semibold">Denunciante</label>
        <div>
          <router-link :to="`/perfil/${denunciaDetalle.denuncianteUserId}`" class="text-decoration-none">
            {{ denunciaDetalle.denuncianteNombre }}
          </router-link>
          <span v-if="denunciaDetalle.denunciantePersonajeNombre" class="text-muted small">
            ({{ denunciaDetalle.denunciantePersonajeNombre }})
          </span>
        </div>
      </div>

      <!-- Información de resolución (si ya está resuelta/ignorada) -->
      <div v-if="denunciaDetalle.estado !== 'PENDIENTE'" class="mb-3">
        <label class="form-label fw-semibold">Resolución</label>
        <div class="border rounded p-2">
          <div v-if="denunciaDetalle.decision">{{ denunciaDetalle.decision }}</div>
          <div v-else class="text-muted fst-italic">Sin nota.</div>
          <div class="small text-muted mt-1">
            {{ denunciaDetalle.resueltoPorNombre ? `por ${denunciaDetalle.resueltoPorNombre}` : '' }}
            {{ denunciaDetalle.fechaResolucion ? '· ' + fechaLegible(denunciaDetalle.fechaResolucion) : '' }}
          </div>
        </div>
      </div>

      <!-- Acciones si está pendiente -->
      <div v-if="denunciaDetalle.estado === 'PENDIENTE'">
        <div class="mb-3">
          <label class="form-label fw-semibold">Nota de la resolución (opcional)</label>
          <textarea v-model="notaDecision" class="form-control" rows="2" maxlength="255" placeholder="Ej: mensaje retirado, advertencia al usuario..."></textarea>
        </div>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-outline-secondary" @click="cerrarDetalle">Cerrar</button>
          <button class="btn btn-outline-secondary" :disabled="resolviendo" @click="ignorar">
            <i class="bi bi-x-circle me-1"></i> Ignorar
          </button>
          <button class="btn btn-success" :disabled="resolviendo" @click="resolver">
            <span v-if="resolviendo" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check-circle me-1"></i> Resolver
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Confirmación -->
  <ModalConfirmacion
    v-if="confirmacion"
    :mensaje="confirmacion.mensaje"
    titulo="Confirmar"
    boton-confirmar="Aceptar"
    @confirmar="confirmacion.ejecutar(); confirmacion = null"
    @cancelar="confirmacion = null"
  />

  <!-- Modal: Aviso -->
  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content-custom {
  background: #fff;
  width: 100%;
  max-width: 560px;
  margin: 1rem;
  max-height: 90vh;
  overflow-y: auto;
}
.preview-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  font-size: 0.85rem;
}
.preview-clamp :deep(p) {
  margin-bottom: 0.25rem;
}
.mensaje-modal {
  max-height: 220px;
  overflow-y: auto;
  padding-right: 0.5rem;
  word-break: break-word;
}
.mensaje-modal :deep(p) {
  margin-bottom: 0.5rem;
}
</style>

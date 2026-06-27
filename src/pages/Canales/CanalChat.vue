<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import OnlineStatusBadge from '../../components/OnlineStatusBadge.vue'
import PerfilPersonajeView from '../Personajes/PerfilPersonajeView.vue'
import { chatApi } from '../../services/chatApi'
import { websocketService } from '../../services/websocket'
import { characterSessionStore } from '../../store/characterSessionStore'

const route = useRoute()
const router = useRouter()
const canalId = computed(() => Number(route.params.id))
const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

interface MensajeDTO {
  id: number
  canalId: number
  personajeId: number
  personajeNombre: string
  personajeAvatar: string
  contenido: string
  fechaEnvio: string
  editado: boolean
  esMio: boolean
}

interface MiembroDTO {
  id: number
  personajeId: number
  personajeNombre: string
  personajeAvatar: string
  rol: string
  fechaUnion: string
  online: boolean
  status?: string
}

const statusOptions = [
  { value: 'conectado', label: 'Conectado', icon: 'bi-circle-fill', color: '#22c55e' },
  { value: 'ausente', label: 'Ausente', icon: 'bi-clock-fill', color: '#eab308' },
  { value: 'ocupado', label: 'Ocupado', icon: 'bi-dash-circle-fill', color: '#ef4444' },
  { value: 'no molestar', label: 'No molestar', icon: 'bi-ban-fill', color: '#a855f7' },
]

function getStatusColor(status: string | undefined | null): string {
  const opt = statusOptions.find(s => s.value === status)
  return opt?.color ?? '#22c55e'
}

const canal = ref<any>(null)
const mensajes = ref<MensajeDTO[]>([])
const miembros = ref<MiembroDTO[]>([])
const miembrosOnline = ref<MiembroDTO[]>([])
const onlineMap = ref<Map<number, boolean>>(new Map())
const statusMap = ref<Map<number, string>>(new Map())
const nuevoMensaje = ref('')
const cargando = ref(true)
const enviando = ref(false)
const mostrarMiembros = ref(false)
const mostrarConectados = ref(true)
const mostrarInfo = ref(false)
const mensajesContainer = ref<HTMLElement | null>(null)
const errorMsg = ref('')

const miPersonajeId = computed(() => characterSessionStore.sesionActiva.value?.personajeId)
const miRol = computed(() => canal.value?.miRol)

const hayColumnaDerecha = computed(() => mostrarConectados.value || mostrarInfo.value)

const mostrarPerfil = ref(false)
const perfilPersonajeId = ref<number | null>(null)
function verPerfil(personajeId: number) {
  perfilPersonajeId.value = personajeId
  mostrarPerfil.value = true
}

// Context menu
const contextMenuTarget = ref<any>(null)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

function abrirContextMenu(e: MouseEvent, m: any) {
  e.preventDefault()
  contextMenuTarget.value = m
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
}

function cerrarContextMenu() {
  contextMenuTarget.value = null
}

// PM modal
const pmModalTarget = ref<any>(null)
const pmMensaje = ref('')
const enviandoPm = ref(false)

function abrirPmModal(m: any) {
  cerrarContextMenu()
  pmModalTarget.value = m
  pmMensaje.value = ''
}

async function enviarPm() {
  const texto = pmMensaje.value.trim()
  if (!texto || !pmModalTarget.value) return
  enviandoPm.value = true
  try {
    await chatApi.enviarMensajePrivado(pmModalTarget.value.personajeId, texto)
    pmModalTarget.value = null
    pmMensaje.value = ''
  } catch {}
  finally { enviandoPm.value = false }
}

// Admin actions
async function ascenderAMod(m: any) {
  cerrarContextMenu()
  if (!confirm(`¿Ascender a ${m.personajeNombre} a moderador?`)) return
  try {
    await chatApi.cambiarRol(canalId.value, m.personajeId, 'MOD')
    await cargarMiembrosOnline()
  } catch {}
}

async function expulsarDelCanal(m: any) {
  cerrarContextMenu()
  if (!confirm(`¿Expulsar a ${m.personajeNombre} del canal?`)) return
  try {
    await chatApi.expulsarMiembro(canalId.value, m.personajeId)
    await cargarMiembrosOnline()
  } catch {}
}

const sidebarsActivos = computed(() => {
  let count = 0
  if (mostrarMiembros.value) count++
  if (hayColumnaDerecha.value) count++
  return count
})

let wsSubscriptions: string[] = []

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return `${import.meta.env.VITE_API_URL}${avatar}`
}

function formatFecha(fecha: string): string {
  const d = new Date(fecha)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const min = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)

  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (h < 24) return `hace ${h} h`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function scrollAlFinal() {
  nextTick(() => {
    if (mensajesContainer.value) {
      mensajesContainer.value.scrollTop = mensajesContainer.value.scrollHeight
    }
  })
}

async function cargarCanal() {
  if (!characterSessionStore.haySesionActiva()) {
    router.push('/dashboard')
    return
  }
  cargando.value = true
  errorMsg.value = ''
  try {
    const [canalRes, msgsRes] = await Promise.all([
      chatApi.obtenerCanal(canalId.value),
      chatApi.obtenerMensajesCanal(canalId.value, 0, 100),
    ])
    canal.value = canalRes.data
    mensajes.value = (msgsRes.data.content || []).reverse()
  } catch (e: any) {
    if (e.response?.status === 403) {
      errorMsg.value = 'No tienes acceso a este canal'
    } else {
      errorMsg.value = 'Error al cargar el canal'
    }
  } finally {
    cargando.value = false
    scrollAlFinal()
  }
}

async function cargarMiembros() {
  try {
    const { data } = await chatApi.listarMiembros(canalId.value)
    miembros.value = data
  } catch {}
}

async function cargarMiembrosOnline() {
  try {
    const localActiveIds = new Set(characterSessionStore.sesiones.value.map(s => s.personajeId))
    const { data } = await chatApi.listarMiembros(canalId.value, 0, 100)
    const members: any[] = data.content || []
    const roleOrder: Record<string, number> = { 'OWNER': 0, 'ADMIN': 1, 'MOD': 2, 'MEMBER': 3 }
    miembrosOnline.value = members
      .filter((m: any) => m.online || localActiveIds.has(m.personajeId))
      .sort((a: any, b: any) => (roleOrder[a.rol] ?? 99) - (roleOrder[b.rol] ?? 99))
    for (const m of members) {
      onlineMap.value.set(m.personajeId, m.online || localActiveIds.has(m.personajeId))
      if (m.status) {
        statusMap.value.set(m.personajeId, m.status)
      }
    }
    onlineMap.value = new Map(onlineMap.value)
    statusMap.value = new Map(statusMap.value)
  } catch {}
}

async function conectarWebSocket() {
  const token = characterSessionStore.getToken()
  if (!token) return

  try {
    await websocketService.connect(token)

    const sub1 = websocketService.subscribeToChannel(canalId.value, (msg: MensajeDTO) => {
      const idx = mensajes.value.findIndex(m => m.id === msg.id)
      if (idx >= 0) {
        mensajes.value[idx] = msg
      } else {
        mensajes.value.push(msg)
        scrollAlFinal()
      }
    })
    wsSubscriptions.push(sub1)

    const sub2 = websocketService.subscribeToChannelPresence(canalId.value, (data: any) => {
      onlineMap.value.set(data.personajeId, data.online)
      onlineMap.value = new Map(onlineMap.value)
      if (data.status) {
        statusMap.value.set(data.personajeId, data.status)
        statusMap.value = new Map(statusMap.value)
      }
      cargarMiembrosOnline()
    })
    wsSubscriptions.push(sub2)
  } catch {}
}

async function enviarMensaje() {
  const texto = nuevoMensaje.value.trim()
  if (!texto || enviando.value) return

  enviando.value = true
  const sessionToken = characterSessionStore.getToken()

  if (websocketService.connected.value && sessionToken) {
    websocketService.sendChannelMessage(canalId.value, texto)
    nuevoMensaje.value = ''
    enviando.value = false
  } else {
    try {
      await chatApi.enviarMensajeCanal(canalId.value, texto)
      nuevoMensaje.value = ''
      const msgsRes = await chatApi.obtenerMensajesCanal(canalId.value, 0, 100)
      mensajes.value = (msgsRes.data.content || []).reverse()
      scrollAlFinal()
    } catch {
      // silencioso
    } finally {
      enviando.value = false
    }
  }
}

function estaOnline(personajeId: number): boolean {
  return onlineMap.value.get(personajeId) ?? false
}

function esAdminOrOwner(): boolean {
  return miRol.value === 'OWNER' || miRol.value === 'ADMIN' || miRol.value === 'MOD'
}

async function eliminarMensaje(mensajeId: number) {
  if (!confirm('¿Eliminar este mensaje?')) return
  try {
    await chatApi.eliminarMensajeCanal(canalId.value, mensajeId)
    mensajes.value = mensajes.value.filter(m => m.id !== mensajeId)
  } catch {}
}

async function salirDelCanal() {
  if (!confirm('¿Salir del canal?')) return
  try {
    await chatApi.salirDeCanal(canalId.value)
    router.push('/canales')
  } catch {}
}

onMounted(async () => {
  await characterSessionStore.obtenerSesionesActivas()
  await cargarCanal()
  if (canal.value) {
    await Promise.all([cargarMiembros(), conectarWebSocket()])
    await cargarMiembrosOnline()
  }
})

onUnmounted(() => {
  wsSubscriptions.forEach((sub) => websocketService.unsubscribe(sub))
})
</script>

<template>
  <NavBar :logeado="true" />

  <section class="container-fluid mt-3 mb-5" v-if="!cargando && canal">
    <div class="row g-0 chat-panel shadow-sm rounded overflow-hidden border">

      <!-- Panel izquierdo: miembros (sidebar) -->
      <div class="col-12 col-md-3 sidebar-col border-end" v-if="mostrarMiembros">
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h6 class="mb-0">Miembros ({{ miembros.length }})</h6>
          <button class="btn-close" @click="mostrarMiembros = false"></button>
        </div>
        <div class="list-group list-group-flush">
          <div v-for="m in miembros" :key="m.id" class="list-group-item d-flex align-items-center gap-2">
            <div class="avatar-wrapper">
              <img :src="avatarUrl(m.personajeAvatar)" class="rounded-circle" width="32" height="32" style="object-fit: cover;" />
              <OnlineStatusBadge :online="estaOnline(m.personajeId)" size="sm" />
            </div>
            <div class="flex-grow-1">
              <small class="d-block">{{ m.personajeNombre }}</small>
              <small class="text-muted" style="font-size: 0.65rem;">{{ m.rol }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna central: chat -->
      <div class="col" :class="{ 'col-md-9': sidebarsActivos === 1, 'col-md-6': sidebarsActivos === 2 }">
        <!-- Cabecera -->
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
          <div>
            <h5 class="mb-0">{{ canal.nombre }}</h5>
            <small class="text-muted">{{ canal.descripcion || 'Sin descripción' }}</small>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" @click="mostrarMiembros = !mostrarMiembros" title="Miembros">
              <i class="bi bi-people"></i>
            </button>
            <button class="btn btn-outline-secondary btn-sm" @click="mostrarConectados = !mostrarConectados" title="Conectados">
              <i class="bi bi-person-check"></i>
            </button>
            <button class="btn btn-outline-secondary btn-sm" @click="mostrarInfo = !mostrarInfo" title="Info">
              <i class="bi bi-info-circle"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" @click="salirDelCanal" title="Salir">
              <i class="bi bi-box-arrow-left"></i>
            </button>
          </div>
        </div>

        <!-- Mensajes -->
        <div ref="mensajesContainer" class="mensajes-container p-3">
          <div v-if="mensajes.length === 0" class="text-center text-muted py-5">
            <i class="bi bi-chat-dots fs-1 d-block mb-2 opacity-50"></i>
            <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
          </div>

          <div v-for="msg in mensajes" :key="msg.id"
               class="mensaje-row d-flex gap-2 mb-3"
               :class="{ 'flex-row-reverse': msg.esMio }">

            <img :src="avatarUrl(msg.personajeAvatar)"
                 class="rounded-circle flex-shrink-0" width="36" height="36" style="object-fit: cover;" />

            <div class="mensaje-burbuja" :class="msg.esMio ? 'propio' : 'ajeno'">
              <div class="d-flex justify-content-between align-items-baseline gap-2">
                <small class="fw-bold" :class="msg.esMio ? 'text-white' : ''">
                  {{ msg.personajeNombre }}
                </small>
                <small class="text-muted" style="font-size: 0.65rem;">
                  {{ formatFecha(msg.fechaEnvio) }}
                  <span v-if="msg.editado" class="ms-1">(editado)</span>
                </small>
              </div>
              <p class="mb-0 mt-1" style="white-space: pre-wrap; word-break: break-word;">
                {{ msg.contenido }}
              </p>
              <button v-if="msg.esMio && esAdminOrOwner()"
                      class="btn btn-sm text-danger p-0 mt-1"
                      style="font-size: 0.65rem;"
                      @click="eliminarMensaje(msg.id)">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="p-3 border-top bg-light">
          <form @submit.prevent="enviarMensaje" class="d-flex gap-2">
            <input v-model="nuevoMensaje" type="text" class="form-control" placeholder="Escribe un mensaje..."
                   maxlength="2000" autofocus />
            <button type="submit" class="btn btn-primary" :disabled="!nuevoMensaje.trim() || enviando">
              <i class="bi bi-send"></i>
            </button>
          </form>
        </div>
      </div>

      <!-- Panel derecho: conectados + info -->
      <div class="col-12 col-md-3 sidebar-col border-start" v-if="mostrarConectados || mostrarInfo">

        <!-- Conectados -->
        <div v-if="mostrarConectados">
          <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Conectados ({{ miembrosOnline.length }})</h6>
            <button class="btn-close" @click="mostrarConectados = false"></button>
          </div>
          <div class="list-group list-group-flush">
            <div v-if="miembrosOnline.length === 0" class="list-group-item text-muted text-center py-3">
              <small>No hay personajes conectados</small>
            </div>
            <div v-for="m in miembrosOnline" :key="m.id" class="list-group-item d-flex align-items-center gap-2"
                 @contextmenu.prevent="abrirContextMenu($event, m)">
              <div class="avatar-wrapper" style="cursor:pointer;" @click="verPerfil(m.personajeId)">
                <img :src="avatarUrl(m.personajeAvatar)"
                     class="rounded-circle" width="32" height="32" style="object-fit: cover;" />
                <span class="online-dot" :style="{ background: getStatusColor(statusMap.get(m.personajeId)) }"></span>
              </div>
              <i v-if="m.rol === 'OWNER'" class="bi bi-key-fill text-warning"></i>
              <i v-else-if="m.rol === 'MOD'" class="bi bi-shield-fill-check text-success"></i>
              <small style="cursor:pointer;" @click="verPerfil(m.personajeId)">{{ m.personajeNombre }}</small>
            </div>
          </div>
        </div>

        <!-- Información -->
        <div v-if="mostrarInfo">
          <div class="p-3 border-bottom d-flex justify-content-between align-items-center" :class="{ 'border-top': mostrarConectados }">
            <h6 class="mb-0">Información</h6>
            <button class="btn-close" @click="mostrarInfo = false"></button>
          </div>
          <div class="p-3">
            <dl class="mb-0">
              <dt>Tipo</dt>
              <dd>{{ canal.tipo === 'OFFICIAL' ? 'Oficial' : 'Creado por usuarios' }}</dd>
              <dt>Privado</dt>
              <dd>{{ canal.privado ? 'Sí' : 'No' }}</dd>
              <dt>Miembros</dt>
              <dd>{{ canal.miembroCount || miembros.length }}</dd>
              <dt>Tu rol</dt>
              <dd><span class="badge bg-secondary">{{ canal.miRol }}</span></dd>
            </dl>
          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- Estado cargando -->
  <section class="container mt-5" v-else-if="cargando">
    <div class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>
  </section>

  <!-- Error -->
  <section class="container mt-5" v-else-if="errorMsg">
    <div class="alert alert-danger">{{ errorMsg }}</div>
    <router-link to="/canales" class="btn btn-outline-primary">Volver a canales</router-link>
  </section>

  <Footer />

  <!-- Context menu: clic derecho en conectados -->
  <div v-if="contextMenuTarget" class="context-menu-overlay" @click="cerrarContextMenu" @contextmenu.prevent="cerrarContextMenu"></div>
  <div v-if="contextMenuTarget" class="context-menu" :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }">
    <button class="context-menu-item" @click="verPerfil(contextMenuTarget.personajeId); cerrarContextMenu()">
      <i class="bi bi-person-vcard me-2"></i> Perfil
    </button>
    <button class="context-menu-item" @click="abrirPmModal(contextMenuTarget)">
      <i class="bi bi-envelope me-2"></i> Mensaje Privado
    </button>
    <div v-if="(miRol === 'OWNER' || miRol === 'ADMIN') && contextMenuTarget.rol === 'MEMBER'" class="context-menu-divider"></div>
    <button v-if="(miRol === 'OWNER' || miRol === 'ADMIN') && contextMenuTarget.rol === 'MEMBER'"
            class="context-menu-item" @click="ascenderAMod(contextMenuTarget)">
      <i class="bi bi-shield me-2"></i> Ascender a moderador
    </button>
    <button v-if="(miRol === 'OWNER' || miRol === 'ADMIN' || miRol === 'MOD')
                  && contextMenuTarget.personajeId !== miPersonajeId
                  && contextMenuTarget.rol !== 'OWNER' && contextMenuTarget.rol !== 'ADMIN'"
            class="context-menu-item text-danger" @click="expulsarDelCanal(contextMenuTarget)">
      <i class="bi bi-door-open me-2"></i> Expulsar del canal
    </button>
  </div>

  <!-- Modal: Mensaje Privado directo -->
  <div v-if="pmModalTarget" class="modal-backdrop-custom" @click.self="pmModalTarget = null">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:450px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-envelope me-2"></i>Mensaje para {{ pmModalTarget.personajeNombre }}</h5>
        <button class="btn-close" @click="pmModalTarget = null"></button>
      </div>
      <textarea v-model="pmMensaje" class="form-control" rows="4" placeholder="Escribe tu mensaje..."
                :disabled="enviandoPm" @keydown.ctrl.enter="enviarPm"></textarea>
      <div class="d-flex justify-content-end mt-3">
        <button class="btn btn-outline-secondary btn-sm me-2" @click="pmModalTarget = null">Cancelar</button>
        <button class="btn btn-primary btn-sm" :disabled="!pmMensaje.trim() || enviandoPm" @click="enviarPm">
          <i v-if="enviandoPm" class="spinner-border spinner-border-sm me-1"></i>
          <i v-else class="bi bi-send me-1"></i>
          Enviar
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Perfil del personaje -->
  <div v-if="mostrarPerfil && perfilPersonajeId" class="modal-backdrop-custom perfil-modal-full" @click.self="mostrarPerfil = false">
    <div class="perfil-modal-container">
      <PerfilPersonajeView
        :personaje-id="perfilPersonajeId"
        :modo-modal="true"
        @cerrar="mostrarPerfil = false"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  height: calc(100vh - 140px);
  background: #fff;
}

.sidebar-col {
  overflow-y: auto;
  max-height: calc(100vh - 140px);
  background: #f8f9fa;
}

.mensajes-container {
  overflow-y: auto;
  height: calc(100vh - 250px);
  background: #fff;
}

.mensaje-row {
  max-width: 80%;
}

.mensaje-row.flex-row-reverse {
  margin-left: auto;
}

.mensaje-burbuja {
  padding: 8px 14px;
  border-radius: 16px;
  max-width: 100%;
  min-width: 100px;
}

.mensaje-burbuja.ajeno {
  background: #f0f2f5;
  border-bottom-left-radius: 4px;
}

.mensaje-burbuja.propio {
  background: #0d6efd;
  color: white;
  border-bottom-right-radius: 4px;
}

.mensaje-burbuja.propio .text-muted {
  color: rgba(255, 255, 255, 0.7) !important;
}

.avatar-wrapper {
  position: relative;
  display: inline-flex;
}

.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
}

textarea {
  resize: none;
}

.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1060;
}
.perfil-modal-full {
  align-items: stretch;
  padding: 1rem;
}
.perfil-modal-container {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  max-height: calc(100vh - 2rem);
  box-shadow: 0 8px 40px rgba(0,0,0,0.18);
}
.modal-content-custom {
  background: #fff;
  width: 100%;
  max-width: 520px;
  margin: 1rem;
  max-height: 80vh;
  overflow-y: auto;
}
.context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 1070;
}
.context-menu {
  position: fixed;
  z-index: 1071;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  min-width: 180px;
  padding: 4px 0;
}
.context-menu-item {
  display: block;
  width: 100%;
  border: none;
  background: none;
  padding: 8px 16px;
  text-align: left;
  font-size: 0.85rem;
  cursor: pointer;
}
.context-menu-item:hover { background: #f0f2f5; }
.context-menu-divider {
  height: 1px;
  background: #e9ecef;
  margin: 4px 0;
}
</style>

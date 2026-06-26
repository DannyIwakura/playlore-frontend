<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import OnlineStatusBadge from '../../components/OnlineStatusBadge.vue'
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
}

const canal = ref<any>(null)
const mensajes = ref<MensajeDTO[]>([])
const miembros = ref<MiembroDTO[]>([])
const onlineMap = ref<Map<number, boolean>>(new Map())
const nuevoMensaje = ref('')
const cargando = ref(true)
const enviando = ref(false)
const mostrarMiembros = ref(false)
const mostrarInfo = ref(false)
const mensajesContainer = ref<HTMLElement | null>(null)
const errorMsg = ref('')

const miPersonajeId = computed(() => characterSessionStore.sesionActiva.value?.personajeId)
const miRol = computed(() => canal.value?.miRol)

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
  await cargarCanal()
  if (canal.value) {
    await Promise.all([cargarMiembros(), conectarWebSocket()])
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
      <div class="col" :class="{ 'col-md-9': mostrarMiembros, 'col-md-12': !mostrarMiembros }">
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

      <!-- Panel info (derecha) -->
      <div class="col-12 col-md-3 sidebar-col border-start" v-if="mostrarInfo">
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
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

textarea {
  resize: none;
}
</style>

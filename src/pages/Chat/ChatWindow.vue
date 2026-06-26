<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { userStore } from '../../store/userStore'
import { characterSessionStore } from '../../store/characterSessionStore'
import { websocketService } from '../../services/websocket'
import { chatApi } from '../../services/chatApi'
import api from '../../services/api'
import PerfilPersonajeView from '../Personajes/PerfilPersonajeView.vue'
import logoUrl from '../../assets/img/lOGOpLAYlORE.png'

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

const router = useRouter()

const personajes = ref<any[]>([])
const canalesUnidos = ref<any[]>([])
const canalActivo = ref<any>(null)
const mensajes = ref<any[]>([])
const miembros = ref<any[]>([])
const onlineMap = ref<Map<number, boolean>>(new Map())
const nuevoMensaje = ref('')
const cargando = ref(true)
const enviando = ref(false)
const mensajesContainer = ref<HTMLElement | null>(null)
const sidebarVisible = ref(window.innerWidth >= 768)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const esMobile = () => window.innerWidth < 768
const errorMsg = ref('')

const PAGE_SIZE = 15
const pagina = ref(0)
const cargandoMas = ref(false)
const hayMasMensajes = ref(true)
const usuarioScrolledUp = ref(false)

const statusOptions = [
  { value: 'conectado', label: 'Conectado', icon: 'bi-circle-fill', color: '#22c55e' },
  { value: 'ausente', label: 'Ausente', icon: 'bi-clock-fill', color: '#eab308' },
  { value: 'ocupado', label: 'Ocupado', icon: 'bi-dash-circle-fill', color: '#ef4444' },
  { value: 'no molestar', label: 'No molestar', icon: 'bi-ban-fill', color: '#a855f7' },
]
const statusMap = ref<Map<number, string>>(new Map())
const estadoActual = computed(() => statusMap.value.get(characterSessionStore.sesionActual.value?.personajeId ?? -1) ?? 'conectado')
const mostrarSelectorEstado = ref(false)
function cambiarEstado(valor: string) {
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid) {
    statusMap.value.set(pid, valor)
    statusMap.value = new Map(statusMap.value)
  }
  mostrarSelectorEstado.value = false
}

const mostrarListaCanales = ref(false)
const pestanaLista = ref<'oficiales' | 'usuarios'>('oficiales')
const canalesOficiales = ref<any[]>([])
const canalesUsuarios = ref<any[]>([])
const cargandoLista = ref(false)

const mostrarModalCrear = ref(false)
const nuevoCanalData = ref({ nombre: '', descripcion: '', privado: false })
const errorCrear = ref('')

const mostrarPerfil = ref(false)
const perfilPersonajeId = ref<number | null>(null)

const mostrarConfirmacionDesconectar = ref(false)
const personajeDesconectarIdx = ref(-1)

const mostrarConfirmacionEliminar = ref(false)
const mensajeAEliminarId = ref<number | null>(null)

const mostrarSelectorPersonajes = ref(false)

const unreadCountMap = ref<Map<number, number>>(new Map())

const mostrarListaMiembros = ref(false)
const miembrosLista = ref<any[]>([])
const paginaMiembros = ref(0)
const cargandoMiembros = ref(false)
const hayMasMiembros = ref(true)

let wsSubscriptions: string[] = []

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return `${import.meta.env.VITE_API_URL}${avatar}`
}

function canalAvatar(nombre: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=0d6efd&color=fff&bold=true&size=32`
}

const statusColor = computed(() => {
  const opt = statusOptions.find(s => s.value === estadoActual.value)
  return opt?.color ?? '#22c55e'
})

function getTabStatusColor(personajeId: number): string {
  const online = onlineMap.value.get(personajeId)
  if (!online) return '#9ca3af'
  const status = statusMap.value.get(personajeId)
  return statusOptions.find(s => s.value === status)?.color ?? '#22c55e'
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

function scrollAlFinalForzado() {
  usuarioScrolledUp.value = false
  scrollAlFinal()
}

async function cargarPersonajes() {
  if (!userStore.usuario.value?.id) return
  try {
    const { data } = await api.get(`/personajes/usuario/${userStore.usuario.value.id}`, {
      params: { page: 0, size: 50 }
    })
    personajes.value = data.content || data
  } catch {}
}

async function iniciarSesionPersonaje(personajeId: number) {
  try {
    await characterSessionStore.iniciarSesion(personajeId)
    mostrarSelectorPersonajes.value = false
    wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
    wsSubscriptions = []
    websocketService.disconnect()
    await conectarWebSocket()
    await cargarCanalesUnidos()
    suscribirCanales()
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message || 'Error al iniciar sesión'
    alert(msg)
  }
}

function confirmarDesconectar(idx: number) {
  personajeDesconectarIdx.value = idx
  mostrarConfirmacionDesconectar.value = true
}

function ejecutarDesconectar() {
  const idx = personajeDesconectarIdx.value
  if (idx >= 0) {
    if (idx !== characterSessionStore.sesionActualIdx.value) {
      guardarEstadoSesion()
      characterSessionStore.seleccionarSesion(idx)
    }
    cerrarSesionPersonaje()
  }
  mostrarConfirmacionDesconectar.value = false
  personajeDesconectarIdx.value = -1
}

const personajeDesconectar = computed(() => {
  if (personajeDesconectarIdx.value < 0) return null
  return characterSessionStore.sesiones.value[personajeDesconectarIdx.value] || null
})

async function cerrarSesionPersonaje() {
  guardarEstadoSesion()
  websocketService.disconnect()
  const idx = characterSessionStore.sesionActualIdx.value
  await characterSessionStore.cerrarSesionActual()
  canalActivo.value = null
  mensajes.value = []
  miembros.value = []
  canalesUnidos.value = []
  if (characterSessionStore.sesiones.value.length > 0) {
    restaurarEstadoSesion()
    await reconectarSesion()
  }
}

async function cerrarTodasSesiones() {
  websocketService.disconnect()
  await characterSessionStore.cerrarTodas()
  canalActivo.value = null
  mensajes.value = []
  miembros.value = []
  canalesUnidos.value = []
}

async function conectarWebSocket() {
  const token = characterSessionStore.getToken()
  if (!token) return
  try {
    await websocketService.connect(token)
    const subPres = websocketService.subscribeToPresence((data: any) => {
      onlineMap.value.set(data.personajeId, data.online)
      onlineMap.value = new Map(onlineMap.value)
    })
    wsSubscriptions.push(subPres)
    for (const s of characterSessionStore.sesiones.value) {
      onlineMap.value.set(s.personajeId, true)
      if (!statusMap.value.has(s.personajeId)) {
        statusMap.value.set(s.personajeId, 'conectado')
      }
    }
    onlineMap.value = new Map(onlineMap.value)
    statusMap.value = new Map(statusMap.value)
  } catch {}
}

interface SessionCacheEntry {
  canalActivo: any
  canalesUnidos: any[]
}

const sessionCache = new Map<number, SessionCacheEntry>()

function guardarEstadoSesion() {
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid == null) return
  sessionCache.set(pid, {
    canalActivo: canalActivo.value,
    canalesUnidos: canalesUnidos.value,
  })
}

function restaurarEstadoSesion() {
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid == null) return
  const cached = sessionCache.get(pid)
  if (cached) {
    canalActivo.value = cached.canalActivo
    canalesUnidos.value = cached.canalesUnidos
  } else {
    canalActivo.value = null
    canalesUnidos.value = []
  }
  mensajes.value = []
  pagina.value = 0
  hayMasMensajes.value = true
  usuarioScrolledUp.value = false
}

function suscribirCanales() {
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  wsSubscriptions = []
  for (const canal of canalesUnidos.value) {
    const subMsgs = websocketService.subscribeToChannel(canal.id, (msg: any) => {
      if (canalActivo.value?.id === canal.id) {
        const idx = mensajes.value.findIndex((m: any) => m.id === msg.id)
        if (idx >= 0) {
          const existing = mensajes.value[idx]
          if (existing.eliminado) return
          mensajes.value[idx] = msg
        } else {
          mensajes.value.push(msg)
          if (!usuarioScrolledUp.value) scrollAlFinal()
        }
      } else {
        const current = unreadCountMap.value.get(canal.id) || 0
        unreadCountMap.value.set(canal.id, current + 1)
        unreadCountMap.value = new Map(unreadCountMap.value)
      }
    })
    wsSubscriptions.push(subMsgs)
  }
}

async function reconectarSesion() {
  websocketService.disconnect()
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  wsSubscriptions = []
  await conectarWebSocket()
  unreadCountMap.value = new Map()
  await cargarCanalesUnidos()
  suscribirCanales()
  if (canalActivo.value) {
    try {
      const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, 0, PAGE_SIZE)
      const content: any[] = data.content || []
      hayMasMensajes.value = !data.last
      mensajes.value = content.reverse()
      scrollAlFinal()
    } catch { mensajes.value = [] }
  }
}

function cambiarSesion(index: number) {
  if (index === characterSessionStore.sesionActualIdx.value) return
  guardarEstadoSesion()
  characterSessionStore.seleccionarSesion(index)
  restaurarEstadoSesion()
  reconectarSesion()
}

async function cargarCanalesUnidos() {
  try {
    const { data } = await chatApi.obtenerCanalesUnidos()
    canalesUnidos.value = data
  } catch {}
}

async function seleccionarCanal(canal: any) {
  canalActivo.value = canal
  unreadCountMap.value.set(canal.id, 0)
  unreadCountMap.value = new Map(unreadCountMap.value)
  cargando.value = true
  errorMsg.value = ''
  pagina.value = 0
  hayMasMensajes.value = true
  usuarioScrolledUp.value = false
  if (window.innerWidth < 768) sidebarVisible.value = false
  try {
    const { data } = await chatApi.obtenerMensajesCanal(canal.id, 0, PAGE_SIZE)
    const content: any[] = data.content || []
    hayMasMensajes.value = !data.last
    mensajes.value = content.reverse()
  } catch (e: any) {
    if (e.response?.status === 403) errorMsg.value = 'No tienes acceso a este canal'
    else errorMsg.value = 'Error al cargar el canal'
  } finally {
    cargando.value = false
    scrollAlFinal()
  }
}

function autoResizeTextarea() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    enviarMensaje()
  }
}

function resetTextareaHeight() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
}

async function enviarMensaje() {
  const texto = nuevoMensaje.value.trim()
  if (!texto || enviando.value || !canalActivo.value) return
  enviando.value = true
  const token = characterSessionStore.getToken()
  if (websocketService.connected.value && token) {
    websocketService.sendChannelMessage(canalActivo.value.id, texto)
    nuevoMensaje.value = ''
    resetTextareaHeight()
    enviando.value = false
  } else {
    try {
      await chatApi.enviarMensajeCanal(canalActivo.value.id, texto)
      nuevoMensaje.value = ''
      resetTextareaHeight()
      pagina.value = 0
      const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, 0, PAGE_SIZE)
      hayMasMensajes.value = !data.last
      mensajes.value = (data.content || []).reverse()
      usuarioScrolledUp.value = false
      scrollAlFinal()
    } catch {} finally { enviando.value = false }
  }
}

async function eliminarMensaje(mensajeId: number) {
  mensajeAEliminarId.value = mensajeId
  mostrarConfirmacionEliminar.value = true
}

async function ejecutarEliminarMensaje() {
  const mensajeId = mensajeAEliminarId.value
  if (!mensajeId || !canalActivo.value) return
  try {
    await chatApi.eliminarMensajeCanal(canalActivo.value.id, mensajeId)
    const msg = mensajes.value.find((m: any) => m.id === mensajeId)
    if (msg) {
      msg.eliminado = true
      msg.eliminadoPorModerador = esAdminOrOwner()
    }
  } catch {}
  mostrarConfirmacionEliminar.value = false
  mensajeAEliminarId.value = null
}

async function abrirListaCanales() {
  mostrarListaCanales.value = true
  cargandoLista.value = true
  pestanaLista.value = 'oficiales'
  try {
    const [unidos, disponibles] = await Promise.all([
      chatApi.obtenerCanalesUnidos(),
      chatApi.obtenerCanalesDisponibles(),
    ])
    const todosUnidos = unidos.data
    canalesOficiales.value = disponibles.data.filter((c: any) => c.tipo === 'OFFICIAL')
    canalesUsuarios.value = todosUnidos.filter((c: any) => c.tipo === 'USER_CREATED')
      .concat(disponibles.data.filter((c: any) => c.tipo === 'USER_CREATED'))
    const seen = new Set<number>()
    canalesUsuarios.value = canalesUsuarios.value.filter((c: any) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  } catch {} finally { cargandoLista.value = false }
}

async function unirseACanal(canalId: number) {
  try {
    await chatApi.unirseACanal(canalId)
    await cargarCanalesUnidos()
    suscribirCanales()
    mostrarListaCanales.value = false
  } catch (e: any) {
    alert(e.response?.data?.error || 'Error al unirse')
  }
}

async function crearCanal() {
  if (!nuevoCanalData.value.nombre.trim()) { errorCrear.value = 'El nombre es obligatorio'; return }
  errorCrear.value = ''
  try {
    const { data } = await chatApi.crearCanal(nuevoCanalData.value)
    mostrarModalCrear.value = false
    nuevoCanalData.value = { nombre: '', descripcion: '', privado: false }
    await cargarCanalesUnidos()
    suscribirCanales()
    seleccionarCanal(data)
  } catch (e: any) { errorCrear.value = e.response?.data?.error || 'Error al crear el canal' }
}

async function cargarMensajesAntiguos() {
  if (cargandoMas.value || !hayMasMensajes.value || !canalActivo.value) return
  cargandoMas.value = true
  const nextPage = pagina.value + 1
  try {
    const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, nextPage, PAGE_SIZE)
    const content: any[] = data.content || []
    if (content.length === 0) { hayMasMensajes.value = false; return }
    hayMasMensajes.value = !data.last
    pagina.value = nextPage
    const container = mensajesContainer.value
    const prevScrollHeight = container?.scrollHeight ?? 0
    const prevScrollTop = container?.scrollTop ?? 0
    content.reverse().forEach((msg: any) => {
      if (!mensajes.value.some((m: any) => m.id === msg.id)) {
        mensajes.value.unshift(msg)
      }
    })
    if (container) {
      await nextTick()
      container.scrollTop = container.scrollHeight - prevScrollHeight + prevScrollTop
    }
  } catch {} finally { cargandoMas.value = false }
}

function handleScroll() {
  const container = mensajesContainer.value
  if (!container) return
  usuarioScrolledUp.value = container.scrollTop < container.scrollHeight - container.clientHeight - 100
  if (container.scrollTop <= 60) cargarMensajesAntiguos()
}

async function salirDelCanal() {
  if (!confirm('¿Salir del canal?') || !canalActivo.value) return
  const canalId = canalActivo.value.id
  try {
    await chatApi.salirDeCanal(canalId)
    canalActivo.value = null
    mensajes.value = []
    miembros.value = []
    unreadCountMap.value.delete(canalId)
    unreadCountMap.value = new Map(unreadCountMap.value)
    await cargarCanalesUnidos()
    suscribirCanales()
  } catch {}
}

function verPerfil(personajeId: number) {
  perfilPersonajeId.value = personajeId
  mostrarPerfil.value = true
}

function estaOnline(personajeId: number): boolean {
  return onlineMap.value.get(personajeId) ?? false
}

function esAdminOrOwner(): boolean {
  const rol = canalActivo.value?.miRol
  return rol === 'OWNER' || rol === 'ADMIN' || rol === 'MOD'
}

async function abrirListaMiembros() {
  if (!canalActivo.value) return
  mostrarListaMiembros.value = true
  miembrosLista.value = []
  paginaMiembros.value = 0
  hayMasMiembros.value = true
  await cargarMasMiembros()
}

async function cargarMasMiembros() {
  if (!canalActivo.value || cargandoMiembros.value) return
  cargandoMiembros.value = true
  try {
    const { data } = await chatApi.listarMiembros(canalActivo.value.id, paginaMiembros.value, 10)
    const content: any[] = data.content || []
    miembrosLista.value.push(...content)
    hayMasMiembros.value = !data.last
    paginaMiembros.value++
  } catch {} finally { cargandoMiembros.value = false }
}

function handleBeforeUnload() {
  websocketService.disconnect()
  const sessionToken = characterSessionStore.getToken()
  const body = sessionToken
    ? JSON.stringify({}) : null
  if (sessionToken) {
    fetch('/api/personajes/sesion/cerrar-todas', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body,
      keepalive: true
    }).catch(() => {})
  }
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  if (!userStore.usuario.value?.id) { router.push('/login'); return }

  const activas = await characterSessionStore.obtenerSesionesActivas()
  if (activas.length > 0) {
    await conectarWebSocket()
    await cargarCanalesUnidos()
    suscribirCanales()
  }
  cargarPersonajes()
  cargando.value = false
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <!-- Sin sesiones activas: selección de personajes -->
  <div v-if="characterSessionStore.sesiones.value.length === 0" class="chat-fullpage bg-gradient-selection d-flex align-items-center justify-content-center">
    <div class="container" style="max-width: 720px;">
      <div class="text-center mb-4">
        <h1 class="fw-bold d-flex align-items-center justify-content-center gap-2">
          <img :src="logoUrl" height="100" alt="PlayLore" />
          <span class="text-muted fw-light">|</span>
          <span>Chat</span>
        </h1>
        <p v-if="personajes.length > 0" class="text-muted">Selecciona un personaje para iniciar sesión</p>
      </div>
      <div v-if="personajes.length === 0" class="text-center py-5">
        <p class="text-muted small mb-3">Crea un personaje para comenzar</p>
        <button class="btn btn-primary px-4" @click="router.push('/personajes/crear')">
          <i class="bi bi-plus-circle me-1"></i> Crear personaje
        </button>
      </div>
      <div v-else class="row g-3">
        <div v-for="p in personajes" :key="p.idPersonaje ?? p.id"
             class="col-6 col-sm-4 col-md-3">
          <div class="card personaje-card h-100 w-100 border-0 shadow-sm text-center p-3">
            <img :src="avatarUrl(p.avatar)"
                 class="rounded-circle mx-auto mb-2"
                 width="64" height="64" style="object-fit: cover;" />
            <h6 class="mb-0 text-truncate">{{ p.nombre }}</h6>
            <small class="text-muted">{{ p.raza || '—' }} {{ p.clase || '' }}</small>
            <button class="btn btn-primary btn-sm mt-2 w-100"
                    :disabled="characterSessionStore.cargando.value"
                    @click="iniciarSesionPersonaje(p.idPersonaje ?? p.id)">
              <i class="bi bi-box-arrow-in-right me-1"></i> Conectarse
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Con sesiones activas: chat completo -->
  <div v-else class="chat-fullpage d-flex flex-column">
    <!-- Barra de pestañas de personajes -->
    <div class="chat-tabs-bar d-flex align-items-center px-2 border-bottom bg-white flex-shrink-0">
      <button v-for="(sesion, idx) in characterSessionStore.sesiones.value"
              :key="sesion.tokenJwt"
              class="chat-tab d-flex align-items-center gap-2 px-3 py-2 border-0 bg-transparent"
              :class="{ active: idx === characterSessionStore.sesionActualIdx.value }"
              @click="cambiarSesion(idx)">
        <div class="position-relative">
          <img :src="avatarUrl(sesion.personajeAvatar)"
               class="rounded-circle" width="28" height="28" style="object-fit:cover; cursor:pointer;" />
          <span class="tab-status-dot" :style="{ background: getTabStatusColor(sesion.personajeId) }"></span>
        </div>
        <span class="small fw-medium text-truncate">{{ sesion.personajeNombre }}</span>
        <button class="btn btn-sm p-0 ms-1 text-muted" @click.stop="confirmarDesconectar(idx)"
                title="Desconectar personaje">
          <i class="bi bi-x" style="font-size:0.8rem;"></i>
        </button>
      </button>
      <button v-if="characterSessionStore.sesiones.value.length < characterSessionStore.MAX_SESIONES"
              class="chat-tab-add d-flex align-items-center justify-content-center border-0 bg-transparent px-3 py-2"
              @click="mostrarSelectorPersonajes = true"
              title="Añadir otro personaje">
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>

    <div class="d-flex flex-grow-1 min-h-0">
      <!-- Sidebar -->
      <aside class="chat-sidebar d-flex flex-column" :class="{ 'd-none d-md-flex': !sidebarVisible }">
        <!-- Perfil del personaje activo -->
        <div class="sidebar-profile p-3 border-bottom">
          <div class="d-flex align-items-center gap-3">
            <div class="position-relative" style="cursor:pointer;" @click="verPerfil(characterSessionStore.sesionActual.value?.personajeId)">
              <img :src="avatarUrl(characterSessionStore.sesionActual.value?.personajeAvatar)"
                   class="rounded-circle" width="44" height="44" style="object-fit: cover;" />
              <span class="status-indicator" :style="{ background: statusColor }"></span>
            </div>
            <div class="flex-grow-1 min-w-0 position-relative">
              <div style="cursor:pointer;" @click="verPerfil(characterSessionStore.sesionActual.value?.personajeId)">
                <h6 class="mb-0 text-truncate">{{ characterSessionStore.sesionActual.value?.personajeNombre }}</h6>
              </div>
              <div class="dropdown-estado" @click="mostrarSelectorEstado = !mostrarSelectorEstado" style="cursor:pointer;">
                <small><i class="bi" :class="statusOptions.find(s=>s.value===estadoActual)?.icon" :style="{ color: statusColor }"></i>
                  {{ statusOptions.find(s=>s.value===estadoActual)?.label }}</small>
              </div>
              <div v-if="mostrarSelectorEstado" class="estado-dropdown-menu">
                <button v-for="opt in statusOptions" :key="opt.value" class="dropdown-item-estado"
                        @click="cambiarEstado(opt.value)">
                  <i class="bi" :class="opt.icon" :style="{ color: opt.color }"></i> {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Botón Lista de canales -->
        <div class="p-3 border-bottom">
          <button class="btn btn-primary w-100 btn-sm d-flex align-items-center justify-content-center gap-2"
                  @click="abrirListaCanales">
            <i class="bi bi-list-ul"></i> Lista de canales
          </button>
        </div>

        <!-- Lista de canales -->
        <div class="sidebar-channels flex-grow-1 overflow-auto">
          <div v-if="canalesUnidos.length === 0" class="text-center text-muted p-3 small">
            No estás en ningún canal
          </div>
          <div v-for="canal in canalesUnidos" :key="canal.id"
               class="channel-item d-flex align-items-center gap-3 px-3 py-2"
               :class="{ active: canalActivo?.id === canal.id, 'channel-unread': (unreadCountMap.get(canal.id) ?? 0) > 0 }"
               @click="seleccionarCanal(canal)">
            <div class="position-relative flex-shrink-0">
              <img :src="canalAvatar(canal.nombre)" class="rounded-circle" width="32" height="32" />
              <span v-if="(unreadCountMap.get(canal.id) ?? 0) > 0" class="unread-dot"></span>
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-2">
                  <small class="fw-medium text-truncate d-block">{{ canal.nombre }}</small>
                  <span v-if="(unreadCountMap.get(canal.id) ?? 0) > 0" class="unread-count">{{ unreadCountMap.get(canal.id) }}</span>
                </div>
                <span v-if="canal.miRol" class="badge bg-secondary" style="font-size:0.6rem;">{{ canal.miRol }}</span>
              </div>
              <small class="text-muted" style="font-size:0.7rem;">{{ canal.miembroCount }} miembros</small>
            </div>
          </div>
        </div>
      </aside>

      <!-- Overlay móvil para sidebar -->
      <div v-if="sidebarVisible && esMobile()" class="sidebar-overlay"
           @click="sidebarVisible = false"></div>

      <!-- Área principal -->
      <main class="chat-main flex-grow-1 d-flex flex-column overflow-hidden position-relative">
        <!-- Sin canal seleccionado -->
        <div v-if="!canalActivo" class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
          <i class="bi bi-chat-dots display-1 mb-3 opacity-25"></i>
          <h5>Selecciona un canal</h5>
          <p class="small">Elige un canal de la barra lateral para empezar a chatear</p>
          <button class="btn btn-outline-primary btn-sm d-md-none" @click="sidebarVisible = true">
            <i class="bi bi-list me-1"></i> Mostrar canales
          </button>
        </div>

        <!-- Canal seleccionado -->
        <template v-else>
          <div class="chat-header d-flex align-items-center gap-3 px-3 py-2 border-bottom bg-light">
            <button class="btn btn-sm btn-outline-secondary d-md-none" @click="sidebarVisible = !sidebarVisible">
              <i class="bi bi-list"></i>
            </button>
            <img :src="canalAvatar(canalActivo.nombre)" class="rounded-circle flex-shrink-0" width="28" height="28" />
            <div class="flex-grow-1 min-w-0">
              <h6 class="mb-0 text-truncate">{{ canalActivo.nombre }}</h6>
              <small class="text-muted" style="font-size:0.7rem;">
                {{ canalActivo.descripcion || 'Sin descripción' }}
                <span v-if="canalActivo.miembroCount != null" class="ms-2 miembros-link" @click="abrirListaMiembros" style="cursor:pointer;text-decoration:underline dotted;">
                  <i class="bi bi-people-fill me-1"></i>{{ canalActivo.miembroCount }} miembros
                </span>
              </small>
            </div>
            <button class="btn btn-sm btn-outline-danger" @click="salirDelCanal" title="Salir del canal">
              <i class="bi bi-box-arrow-left"></i>
            </button>
          </div>

          <!-- Mensajes -->
          <div ref="mensajesContainer" class="chat-mensajes flex-grow-1 p-3 overflow-auto"
               @scroll="handleScroll">
            <div v-if="cargando" class="text-center py-5">
              <div class="spinner-border text-primary spinner-border-sm"></div>
            </div>
            <div v-else-if="errorMsg" class="alert alert-danger py-2">{{ errorMsg }}</div>
            <template v-else-if="mensajes.length > 0">
              <div v-if="cargandoMas" class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-secondary"></div>
              </div>
              <div v-else-if="!hayMasMensajes" class="text-center py-2">
                <small class="text-muted">No hay más mensajes</small>
              </div>
              <div v-for="msg in mensajes" :key="msg.id"
                   class="d-flex gap-2 mb-3"
                   :class="{ 'flex-row-reverse': msg.esMio }"
                   :style="msg.esMio ? 'margin-left:auto;max-width:85%;' : 'max-width:85%;'">
                <img :src="avatarUrl(msg.personajeAvatar)" class="rounded-circle flex-shrink-0"
                     width="32" height="32" style="object-fit: cover; cursor:pointer;"
                     @click="verPerfil(msg.personajeId)" />
                <div class="mensaje-burbuja px-3 py-2" :class="msg.esMio ? 'bg-primary text-white' : 'bg-light'"
                     :style="msg.esMio ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'">
                  <div class="d-flex justify-content-between align-items-baseline gap-2">
                    <small class="fw-bold" style="cursor:pointer;"
                           :class="msg.esMio ? 'text-white' : ''"
                           @click="verPerfil(msg.personajeId)">
                      {{ msg.personajeNombre }}
                    </small>
                    <small class="opacity-50" style="font-size:0.65rem;">
                      {{ formatFecha(msg.fechaEnvio) }}
                      <span v-if="msg.editado" class="ms-1">(edit)</span>
                    </small>
                  </div>
                  <p v-if="msg.eliminado" class="mb-0 mt-1 fst-italic text-muted" style="font-size:0.85rem;">
                    {{ msg.eliminadoPorModerador ? 'El mensaje fue eliminado por moderación' : (msg.esMio ? 'Eliminaste este mensaje' : 'El mensaje fue eliminado por el usuario') }}
                  </p>
                  <p v-else class="mb-0 mt-1" style="white-space:pre-wrap;word-break:break-word;">{{ msg.contenido }}</p>
                  <div v-if="!msg.eliminado && (msg.esMio || esAdminOrOwner())" class="mt-1">
                    <button class="btn btn-sm text-danger p-0" style="font-size:0.65rem;"
                            @click="eliminarMensaje(msg.id)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="text-center text-muted py-5">
              <i class="bi bi-chat-dots fs-1 d-block mb-2 opacity-50"></i>
              <p class="small">No hay mensajes aún. ¡Sé el primero!</p>
            </div>

          </div>

          <!-- Botón volver al final -->
          <transition name="fade">
            <button v-if="usuarioScrolledUp" class="btn btn-light btn-sm rounded-pill shadow scroll-bottom-btn position-absolute"
                    @click="scrollAlFinalForzado" title="Ir al último mensaje">
              <i class="bi bi-arrow-down"></i>
            </button>
          </transition>

          <!-- Input -->
          <div class="chat-input p-3 border-top bg-light">
            <form @submit.prevent="enviarMensaje" class="d-flex gap-2 align-items-end">
              <textarea ref="textareaRef" v-model="nuevoMensaje"
                        class="form-control form-control-sm chat-textarea"
                        placeholder="Escribe un mensaje..." maxlength="2000" rows="1"
                        @keydown="handleKeydown" @input="autoResizeTextarea"></textarea>
              <button type="submit" class="btn btn-primary btn-sm flex-shrink-0"
                      :disabled="!nuevoMensaje.trim() || enviando">
                <i class="bi bi-send"></i>
              </button>
            </form>
          </div>
        </template>
      </main>
    </div>
  </div>

  <!-- Modal: Lista de miembros -->
  <div v-if="mostrarListaMiembros" class="modal-backdrop-custom" @click.self="mostrarListaMiembros = false">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:400px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-people-fill me-2"></i>Miembros</h5>
        <button class="btn-close" @click="mostrarListaMiembros = false"></button>
      </div>
      <div v-if="cargandoMiembros && miembrosLista.length === 0" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary"></div>
      </div>
      <div v-else class="miembros-lista">
        <div v-for="m in miembrosLista" :key="m.id"
             class="d-flex align-items-center gap-3 py-2 px-1 rounded-3">
          <img :src="avatarUrl(m.personajeAvatar)" class="rounded-circle flex-shrink-0"
               width="36" height="36" style="object-fit:cover;" />
          <div class="flex-grow-1 min-w-0">
            <div class="fw-medium small text-truncate">{{ m.personajeNombre }}</div>
            <span class="badge" style="font-size:0.6rem;"
                  :class="m.rol === 'OWNER' ? 'bg-warning text-dark' : m.rol === 'ADMIN' ? 'bg-info text-dark' : m.rol === 'MOD' ? 'bg-success' : 'bg-secondary'">
              {{ m.rol }}
            </span>
          </div>
        </div>
        <div v-if="cargandoMiembros && miembrosLista.length > 0" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-secondary"></div>
        </div>
        <button v-if="hayMasMiembros && !cargandoMiembros"
                class="btn btn-outline-primary btn-sm w-100 mt-2" @click="cargarMasMiembros">
          Mostrar más
        </button>
        <div v-if="!hayMasMiembros && miembrosLista.length > 0" class="text-center text-muted small py-2">
          Todos los miembros cargados
        </div>
      </div>
    </div>
  </div>

  <!-- Modal selector de personajes (para añadir más) -->
  <div v-if="mostrarSelectorPersonajes" class="modal-backdrop-custom" @click.self="mostrarSelectorPersonajes = false">
    <div class="modal-content-custom shadow rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Seleccionar personaje</h5>
        <button class="btn-close" @click="mostrarSelectorPersonajes = false"></button>
      </div>
      <div v-if="personajes.length === 0" class="text-muted small text-center py-3">
        No tienes más personajes disponibles
      </div>
      <div class="row g-2">
        <div v-for="p in personajes" :key="p.idPersonaje ?? p.id"
             class="col-6">
          <button class="card personaje-card h-100 w-100 border-0 shadow-sm text-center p-3"
                  :disabled="characterSessionStore.sesiones.value.some((s:any) => s.personajeId === (p.idPersonaje ?? p.id))"
                  @click="iniciarSesionPersonaje(p.idPersonaje ?? p.id)">
            <img :src="avatarUrl(p.avatar)"
                 class="rounded-circle mx-auto mb-2"
                 width="48" height="48" style="object-fit: cover;" />
            <h6 class="mb-0 text-truncate small">{{ p.nombre }}</h6>
            <small class="text-muted" style="font-size:0.65rem;">{{ p.raza || '—' }} {{ p.clase || '' }}</small>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Lista de canales -->
  <div v-if="mostrarListaCanales" class="modal-backdrop-custom" @click.self="mostrarListaCanales = false">
    <div class="modal-content-custom shadow rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Lista de canales</h5>
        <button class="btn-close" @click="mostrarListaCanales = false"></button>
      </div>
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: pestanaLista === 'oficiales' }"
                  @click="pestanaLista = 'oficiales'">Canales oficiales</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: pestanaLista === 'usuarios' }"
                  @click="pestanaLista = 'usuarios'">Canales de usuarios</button>
        </li>
      </ul>
      <div v-if="cargandoLista" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary"></div>
      </div>
      <template v-else-if="pestanaLista === 'oficiales'">
        <div v-if="canalesOficiales.length === 0" class="text-muted small text-center py-3">
          No hay canales oficiales disponibles
        </div>
        <div v-for="c in canalesOficiales" :key="c.id"
             class="d-flex align-items-center gap-3 p-2 rounded-3 mb-1 hover-bg"
             @click="unirseACanal(c.id)" style="cursor:pointer;">
          <img :src="canalAvatar(c.nombre)" class="rounded-circle" width="36" height="36" />
          <div class="flex-grow-1">
            <small class="fw-medium d-block">{{ c.nombre }}</small>
            <small class="text-muted">{{ c.descripcion || 'Sin descripción' }} · {{ c.miembroCount }} miembros</small>
          </div>
          <button class="btn btn-sm btn-outline-success" @click.stop="unirseACanal(c.id)">Unirse</button>
        </div>
      </template>
      <template v-else>
        <div v-if="canalesUsuarios.length === 0" class="text-muted small text-center py-3">
          No hay canales de usuarios disponibles
        </div>
        <div v-for="c in canalesUsuarios" :key="c.id"
             :class="canalActivo?.id === c.id ? 'd-flex align-items-center gap-3 p-2 rounded-3 mb-1 bg-light' : 'd-flex align-items-center gap-3 p-2 rounded-3 mb-1 hover-bg'"
             @click="canalActivo?.id !== c.id ? unirseACanal(c.id) : (mostrarListaCanales=false)" style="cursor:pointer;">
          <img :src="canalAvatar(c.nombre)" class="rounded-circle" width="36" height="36" />
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between">
              <small class="fw-medium d-block">{{ c.nombre }}</small>
              <span v-if="c.miRol" class="badge bg-secondary" style="font-size:0.6rem;">{{ c.miRol }}</span>
            </div>
            <small class="text-muted">{{ c.descripcion || 'Sin descripción' }} · {{ c.miembroCount }} miembros</small>
          </div>
        </div>
        <hr class="my-2" />
        <button class="btn btn-primary btn-sm w-100" @click="mostrarModalCrear = true; mostrarListaCanales = false">
          <i class="bi bi-plus-lg me-1"></i> Crear nuevo canal
        </button>
      </template>
    </div>
  </div>

  <!-- Modal: Crear canal -->
  <div v-if="mostrarModalCrear" class="modal-backdrop-custom" @click.self="mostrarModalCrear = false">
    <div class="modal-content-custom shadow rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Crear nuevo canal</h5>
        <button class="btn-close" @click="mostrarModalCrear = false"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Nombre del canal</label>
        <input v-model="nuevoCanalData.nombre" type="text" class="form-control form-control-sm" maxlength="100" />
      </div>
      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <textarea v-model="nuevoCanalData.descripcion" class="form-control form-control-sm" rows="2" maxlength="500"></textarea>
      </div>
      <div class="mb-3 form-check">
        <input v-model="nuevoCanalData.privado" type="checkbox" class="form-check-input" id="chkPrivado" />
        <label class="form-check-label small" for="chkPrivado">Canal privado (solo por invitación)</label>
      </div>
      <div v-if="errorCrear" class="alert alert-danger py-1 small">{{ errorCrear }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="mostrarModalCrear = false">Cancelar</button>
        <button class="btn btn-primary btn-sm" @click="crearCanal"><i class="bi bi-check-lg me-1"></i> Crear</button>
      </div>
    </div>
  </div>

  <!-- Modal: Confirmación de eliminar mensaje -->
  <div v-if="mostrarConfirmacionEliminar" class="modal-backdrop-custom" @click.self="mostrarConfirmacionEliminar = false">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:420px;">
      <h5 class="mb-3">Eliminar mensaje</h5>
      <p class="mb-4">¿Seguro que quieres eliminar este mensaje?</p>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="mostrarConfirmacionEliminar = false">Cancelar</button>
        <button class="btn btn-danger btn-sm" @click="ejecutarEliminarMensaje">Eliminar</button>
      </div>
    </div>
  </div>

  <!-- Modal: Perfil completo del personaje (pantalla completa) -->
  <div v-if="mostrarPerfil && perfilPersonajeId" class="modal-backdrop-custom perfil-modal-full" @click.self="mostrarPerfil = false">
    <div class="perfil-modal-container">
      <PerfilPersonajeView
        :personaje-id="perfilPersonajeId"
        :modo-modal="true"
        @cerrar="mostrarPerfil = false"
      />
    </div>
  </div>

  <!-- Modal: Confirmación de desconexión -->
  <div v-if="mostrarConfirmacionDesconectar" class="modal-backdrop-custom" @click.self="mostrarConfirmacionDesconectar = false">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:420px;">
      <h5 class="mb-3">Desconectar personaje</h5>
      <p class="mb-4">¿Seguro que quieres desconectar a <strong>{{ personajeDesconectar?.personajeNombre }}</strong> del chat?</p>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="mostrarConfirmacionDesconectar = false">Cancelar</button>
        <button class="btn btn-danger btn-sm" @click="ejecutarDesconectar">Desconectar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-fullpage {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #fff;
}
.bg-gradient-selection {
  background: linear-gradient(180deg, #e3f0ff 0%, #f0f7ff 40%, #ffffff 100%) !important;
}

/* Personaje card */
.personaje-card {
  border-radius: 12px;
  transition: box-shadow 0.18s, transform 0.18s;
  cursor: pointer;
  background: #fff;
}
.personaje-card:hover {
  box-shadow: 0 6px 20px rgba(13, 110, 253, 0.12);
  transform: translateY(-3px);
}
.personaje-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Tabs bar */
.chat-tabs-bar {
  min-height: 48px;
  overflow-x: auto;
  gap: 2px;
}
.chat-tab {
  white-space: nowrap;
  border-bottom: 2px solid transparent !important;
  transition: border-color 0.15s, background 0.15s;
}
.chat-tab:hover {
  background: #f0f2f5;
}
.chat-tab.active {
  border-bottom-color: #0d6efd !important;
  background: #e8f0fe;
}
.chat-tab-add {
  font-size: 1.1rem;
  color: #0d6efd;
  cursor: pointer;
  border-bottom: 2px solid transparent !important;
}
.chat-tab-add:hover {
  background: #f0f2f5;
}
.tab-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid white;
}

/* Sidebar */
.chat-sidebar {
  width: 300px;
  min-width: 300px;
  background: #f8f9fa;
  border-right: 1px solid #dee2e6;
  height: 100%;
}
@media (max-width: 767.98px) {
  .chat-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 1040;
    width: 280px;
    height: 100vh;
  }
}
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1039;
}

/* Status indicator */
.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

/* Estado dropdown */
.dropdown-estado { position: relative; }
.estado-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 1050;
  min-width: 150px;
  overflow: hidden;
}
.dropdown-item-estado {
  display: block;
  width: 100%;
  border: none;
  background: none;
  padding: 6px 12px;
  text-align: left;
  font-size: 0.8rem;
  cursor: pointer;
}
.dropdown-item-estado:hover { background: #f0f0f0; }

/* Channel list */
.channel-item { cursor: pointer; transition: background 0.12s; }
.channel-item:hover { background: #e9ecef; }
.channel-item.active { background: #d0e2ff; border-left: 3px solid #0d6efd; }
.channel-item.channel-unread { background: #fffbe6; }
.channel-item.channel-unread:hover { background: #fff3b0; }
.unread-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #f8f9fa;
}
.unread-count {
  background: #ef4444;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  line-height: 1.2;
}

/* Chat header */
.chat-header { min-height: 52px; }

/* Chat input textarea */
.chat-textarea {
  resize: none;
  overflow-y: auto;
  max-height: 150px;
  line-height: 1.4;
}

/* Messages */
.chat-mensajes { background: #fff; }
.scroll-bottom-btn {
  bottom: 70px;
  right: 20px;
  z-index: 5;
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  opacity: 0.9;
}
.scroll-bottom-btn:hover { opacity: 1; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.mensaje-burbuja { border-radius: 16px; max-width: 100%; }

/* Perfil trasfondo */
.perfil-trasfondo :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 0.5rem 0;
}

/* Modal */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content-custom {
  background: #fff;
  width: 100%;
  max-width: 520px;
  margin: 1rem;
  max-height: 80vh;
  overflow-y: auto;
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
.hover-bg:hover { background: #f0f2f5; }
.min-w-0 { min-width: 0; }
.min-h-0 { min-height: 0; }

/* ---- Logo shimmer (sin personajes) ---- */
.logo-shimmer-wrapper {
  width: 280px;
  height: auto;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}
.logo-shimmer {
  display: block;
  width: 100%;
  height: auto;
  filter: grayscale(1) brightness(0.6);
  opacity: 0.35;
}
.logo-shimmer-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.5) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer-sweep 2.5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes shimmer-sweep {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>

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
import { EMOJI_CATEGORIES, getRecentEmojis, addRecentEmoji } from './emojiData'

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

const router = useRouter()

const personajes = ref<any[]>([])
const cargandoPersonajes = ref(true)
const canalesUnidos = ref<any[]>([])
const canalActivo = ref<any>(null)
const mensajes = ref<any[]>([])
const miembros = ref<any[]>([])
const miembrosOnline = ref<any[]>([])
const onlineMap = ref<Map<number, boolean>>(new Map())
const nuevoMensaje = ref('')
const cargando = ref(true)
const enviando = ref(false)
const mensajesContainer = ref<HTMLElement | null>(null)
const sidebarVisible = ref(window.innerWidth >= 768)
const mostrarConectados = ref(true)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const esMobile = () => window.innerWidth < 768
const errorMsg = ref('')

const editorRef = ref<HTMLElement | null>(null)

const mostrarEmojiPicker = ref(false)
const categoriaEmojiActiva = ref(0)
const emojiCategories = computed(() => {
  const recent = getRecentEmojis()
  const cats = recent.length > 0
    ? [{ name: 'Usados recientemente', emojis: recent }, ...EMOJI_CATEGORIES]
    : EMOJI_CATEGORIES
  return cats
})

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

function getStatusColor(status: string | undefined | null): string {
  const opt = statusOptions.find(s => s.value === status)
  return opt?.color ?? '#22c55e'
}

async function cambiarEstado(valor: string) {
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid) {
    statusMap.value.set(pid, valor)
    statusMap.value = new Map(statusMap.value)
    try { await chatApi.actualizarStatus(pid, valor) } catch {}
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

// Context menu
const contextMenuTarget = ref<any>(null)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

function abrirContextMenu(e: MouseEvent, m: any) {
  e.preventDefault()
  contextMenuTarget.value = m
  const menuW = 180, menuH = 180
  const maxX = window.innerWidth - menuW
  const maxY = window.innerHeight - menuH
  contextMenuX.value = Math.min(e.clientX, maxX)
  contextMenuY.value = Math.min(e.clientY, maxY)
}

function cerrarContextMenu() {
  contextMenuTarget.value = null
}

// Context menu for private conversations
const conversacionCtxTarget = ref<any>(null)
const conversacionCtxX = ref(0)
const conversacionCtxY = ref(0)

function abrirContextMenuConversacion(e: MouseEvent, conv: any) {
  e.preventDefault()
  conversacionCtxTarget.value = conv
  const menuW = 200, menuH = 80
  const maxX = window.innerWidth - menuW
  const maxY = window.innerHeight - menuH
  conversacionCtxX.value = Math.min(e.clientX, maxX)
  conversacionCtxY.value = Math.min(e.clientY, maxY)
}

function cerrarContextMenuConversacion() {
  conversacionCtxTarget.value = null
}

function eliminarConversacionPrivada() {
  const conv = conversacionCtxTarget.value
  if (!conv) return
  eliminarConversacionDeLista(conv)
  cerrarContextMenuConversacion()
}

function eliminarConversacionDirecta(conv: any) {
  eliminarConversacionDeLista(conv)
}

function eliminarConversacionDeLista(conv: any) {
  if (conversacionActiva.value?.personajeId === conv.personajeId) {
    cerrarConversacion()
  }
  conversacionesPrivadas.value = conversacionesPrivadas.value.filter(
    c => c.personajeId !== conv.personajeId
  )
}

const miRolEnCanal = computed(() => canalActivo.value?.miRol)

// Admin actions
async function ascenderAMod(m: any) {
  cerrarContextMenu()
  if (!confirm(`¿Ascender a ${m.personajeNombre} a moderador?`)) return
  try {
    await chatApi.cambiarRol(canalActivo.value!.id, m.personajeId, 'MOD')
    await cargarMiembrosOnline()
  } catch {}
}

async function expulsarDelCanal(m: any) {
  cerrarContextMenu()
  if (!confirm(`¿Expulsar a ${m.personajeNombre} del canal?`)) return
  try {
    await chatApi.expulsarMiembro(canalActivo.value!.id, m.personajeId)
    await cargarMiembrosOnline()
  } catch {}
}

// Private messages in chat
const conversacionesPrivadas = ref<any[]>([])
const conversacionActiva = ref<any>(null)
const mensajesPrivados = ref<any[]>([])
const noLeidosPriv = ref<Map<number, number>>(new Map())
const noLeidosCharacter = ref<Map<number, number>>(new Map())
const cargandoPriv = ref(false)

function reproducirSonidoPM() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch { /* ignore */ }
}

const modoPrivado = computed(() => conversacionActiva.value !== null)

async function cargarConversaciones() {
  try {
    const { data } = await chatApi.obtenerConversaciones()
    const pid = characterSessionStore.sesionActual.value?.personajeId
    const grouped = new Map<number, any>()
    for (const msg of data) {
      const esReceptor = msg.receptorId === pid
      const otroId = esReceptor ? msg.emisorId : msg.receptorId
      if (!grouped.has(otroId)) {
        grouped.set(otroId, {
          personajeId: otroId,
          personajeNombre: esReceptor ? msg.emisorNombre : msg.receptorNombre,
          personajeAvatar: esReceptor ? msg.emisorAvatar : msg.receptorAvatar,
          ultimoMensaje: msg.contenido,
          fecha: msg.fechaEnvio,
          noLeidos: 0,
        })
      }
      if (esReceptor && !msg.leido) {
        grouped.get(otroId)!.noLeidos++
      }
    }
    conversacionesPrivadas.value = Array.from(grouped.values())
  } catch {}
}

function abrirConversacionPrivada(otroId: number, otroNombre: string, otroAvatar: string) {
  cerrarContextMenu()
  let conv = conversacionesPrivadas.value.find(c => c.personajeId === otroId)
  if (!conv) {
    conv = { personajeId: otroId, personajeNombre: otroNombre, personajeAvatar: otroAvatar, ultimoMensaje: '', noLeidos: 0 }
    conversacionesPrivadas.value.unshift(conv)
  }
  seleccionarConversacion(conv)
}

async function seleccionarConversacion(conv: any) {
  canalActivo.value = null
  conversacionActiva.value = conv
  noLeidosPriv.value.set(conv.personajeId, 0)
  noLeidosPriv.value = new Map(noLeidosPriv.value)
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid != null) {
    noLeidosCharacter.value.set(pid, 0)
    noLeidosCharacter.value = new Map(noLeidosCharacter.value)
  }
  cargandoPriv.value = true
  try {
    const { data } = await chatApi.obtenerConversacion(conv.personajeId)
    mensajesPrivados.value = data || []
    await nextTick()
    scrollAlFinal()
  } catch { mensajesPrivados.value = [] }
  finally { cargandoPriv.value = false }
}

function cerrarConversacion() {
  conversacionActiva.value = null
  mensajesPrivados.value = []
}

function enviarMensajePrivadoWs() {
  const texto = obtenerContenidoEditor()
  console.log('[DEBUG] enviarMensajePrivadoWs - texto:', JSON.stringify(texto))
  if (!texto || !conversacionActiva.value) return
  limpiarEditor()
  const tempMsg: any = {
    id: Date.now(),
    emisorId: characterSessionStore.sesionActual.value?.personajeId,
    receptorId: conversacionActiva.value.personajeId,
    contenido: texto,
    fechaEnvio: new Date().toISOString(),
    esMio: true,
    leido: false,
  }
  mensajesPrivados.value.push(tempMsg)
  nextTick(() => scrollAlFinal())
  const receptorId = conversacionActiva.value.personajeId
  websocketService.sendPrivateMessage(receptorId, texto)
  if (characterSessionStore.sesiones.value.some(s => s.personajeId === receptorId)) {
    const charCount = noLeidosCharacter.value.get(receptorId) || 0
    noLeidosCharacter.value.set(receptorId, charCount + 1)
    noLeidosCharacter.value = new Map(noLeidosCharacter.value)
    reproducirSonidoPM()
  }
  const conv = conversacionesPrivadas.value.find(c => c.personajeId === receptorId)
  if (conv) { conv.ultimoMensaje = texto; conv.fecha = tempMsg.fechaEnvio }
}

const mostrarConfirmacionDesconectar = ref(false)
const personajeDesconectarIdx = ref(-1)

const mostrarConfirmacionEliminar = ref(false)
const mensajeAEliminarId = ref<number | null>(null)

const mostrarSelectorPersonajes = ref(false)

const mostrarAyudaEditor = ref(false)

const unreadCountMap = ref<Map<number, number>>(new Map())
const channelMentionedMap = ref<Map<number, boolean>>(new Map())
const channelLastSeenIds = ref<Record<number, number>>({})

const mostrarListaMiembros = ref(false)
const miembrosLista = ref<any[]>([])
const paginaMiembros = ref(0)
const cargandoMiembros = ref(false)
const hayMasMiembros = ref(true)

let wsSubscriptions: string[] = []
let persistentSubscriptions: string[] = []
let pollingInterval: number | null = null

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
  cargandoPersonajes.value = true
  try {
    const { data } = await api.get(`/personajes/usuario/${userStore.usuario.value.id}`, {
      params: { page: 0, size: 50 }
    })
    personajes.value = data.content || data
  } catch {} finally { cargandoPersonajes.value = false }
}

async function iniciarSesionPersonaje(personajeId: number) {
  try {
    guardarEstadoSesion()
    await characterSessionStore.iniciarSesion(personajeId)
    mostrarSelectorPersonajes.value = false
    persistentSubscriptions.forEach(s => websocketService.unsubscribe(s))
    persistentSubscriptions = []
    wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
    wsSubscriptions = []
    await websocketService.disconnect()
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
  const closedPersonajeId = characterSessionStore.sesionActual.value?.personajeId
  await websocketService.disconnect()
  const idx = characterSessionStore.sesionActualIdx.value
  await characterSessionStore.cerrarSesionActual()
  if (closedPersonajeId != null) {
    onlineMap.value.set(closedPersonajeId, false)
    onlineMap.value = new Map(onlineMap.value)
  }
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
  await websocketService.disconnect()
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
      if (data.status) {
        statusMap.value.set(data.personajeId, data.status)
        statusMap.value = new Map(statusMap.value)
      }
      cargarMiembrosOnline(true)
    })
    persistentSubscriptions.push(subPres)
    const charId = characterSessionStore.sesionActual.value?.personajeId
    if (charId == null) return
    const subPm = websocketService.subscribeToPrivateMessages(charId, (data: any) => {
      const pid = characterSessionStore.sesionActual.value?.personajeId
      data.esMio = data.emisorId === pid
      if (conversacionActiva.value?.personajeId === data.emisorId) {
        mensajesPrivados.value.push(data)
        nextTick(() => scrollAlFinal())
      } else if (data.emisorId === pid && data.receptorId != null) {
        const esOtroPersonaje = characterSessionStore.sesiones.value.some(
          s => s.personajeId === data.receptorId
        )
        if (esOtroPersonaje) {
          const charCount = noLeidosCharacter.value.get(data.receptorId) || 0
          noLeidosCharacter.value.set(data.receptorId, charCount + 1)
          noLeidosCharacter.value = new Map(noLeidosCharacter.value)
          reproducirSonidoPM()
        }
      } else if (data.emisorId !== pid) {
        const count = noLeidosPriv.value.get(data.emisorId) || 0
        noLeidosPriv.value.set(data.emisorId, count + 1)
        noLeidosPriv.value = new Map(noLeidosPriv.value)
        if (pid != null) {
          const charCount = noLeidosCharacter.value.get(pid) || 0
          noLeidosCharacter.value.set(pid, charCount + 1)
          noLeidosCharacter.value = new Map(noLeidosCharacter.value)
        }
        reproducirSonidoPM()
      }
      cargarConversaciones()
    })
    persistentSubscriptions.push(subPm)
    for (const s of characterSessionStore.sesiones.value) {
      onlineMap.value.set(s.personajeId, true)
      if (!statusMap.value.has(s.personajeId)) {
        statusMap.value.set(s.personajeId, 'conectado')
      }
    }
    onlineMap.value = new Map(onlineMap.value)
    statusMap.value = new Map(statusMap.value)
    cargarConversaciones()
  } catch {}
}

interface SessionCacheEntry {
  canalActivo: any
  canalesUnidos: any[]
  channelLastSeen: Record<number, number>
  status?: string
  mensajes: any[]
  pagina: number
  hayMasMensajes: boolean
  usuarioScrolledUp: boolean
}

const sessionCache = new Map<number, SessionCacheEntry>()

function guardarEstadoSesion() {
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid == null) return
  sessionCache.set(pid, {
    canalActivo: canalActivo.value,
    canalesUnidos: canalesUnidos.value,
    channelLastSeen: { ...channelLastSeenIds.value },
    status: statusMap.value.get(pid),
    mensajes: mensajes.value,
    pagina: pagina.value,
    hayMasMensajes: hayMasMensajes.value,
    usuarioScrolledUp: usuarioScrolledUp.value,
    conversacionActiva: conversacionActiva.value,
    mensajesPrivados: mensajesPrivados.value,
  })
}

function restaurarEstadoSesion() {
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid == null) return
  const cached = sessionCache.get(pid)
  if (cached) {
    if (cached.conversacionActiva) {
      canalActivo.value = null
      conversacionActiva.value = cached.conversacionActiva
      mensajesPrivados.value = cached.mensajesPrivados || []
    } else {
      canalActivo.value = cached.canalActivo
      conversacionActiva.value = null
      mensajesPrivados.value = []
    }
    canalesUnidos.value = cached.canalesUnidos
    channelLastSeenIds.value = cached.channelLastSeen ?? {}
    if (cached.status) {
      statusMap.value.set(pid, cached.status)
      statusMap.value = new Map(statusMap.value)
    }
    mensajes.value = cached.mensajes
    pagina.value = cached.pagina
    hayMasMensajes.value = cached.hayMasMensajes
    usuarioScrolledUp.value = cached.usuarioScrolledUp
  } else {
    canalActivo.value = null
    conversacionActiva.value = null
    mensajesPrivados.value = []
    canalesUnidos.value = []
    channelLastSeenIds.value = {}
    mensajes.value = []
    pagina.value = 0
    hayMasMensajes.value = true
    usuarioScrolledUp.value = false
  }
  unreadCountMap.value = new Map()
}

function suscribirCanales() {
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  wsSubscriptions = []
  for (const canal of canalesUnidos.value) {
    const subMsgs = websocketService.subscribeToChannel(canal.id, (msg: any) => {
      const pid = characterSessionStore.sesionActual.value?.personajeId
      msg.esMio = msg.personajeId === pid
      console.log('[DEBUG] received channel msg:', JSON.stringify({ id: msg.id, contenido: msg.contenido, esMio: msg.esMio }))
      if (canalActivo.value?.id === canal.id) {
        const idx = mensajes.value.findIndex((m: any) => m.id === msg.id)
        if (idx >= 0) {
          const existing = mensajes.value[idx]
          if (existing.eliminado) return
          console.log('[DEBUG] replacing local msg with server msg')
          mensajes.value[idx] = msg
        } else {
          mensajes.value.push(msg)
          if (!usuarioScrolledUp.value) scrollAlFinal()
        }
        if (msg.id > (channelLastSeenIds.value[canal.id] ?? 0)) {
          channelLastSeenIds.value[canal.id] = msg.id
        }
      } else {
        const current = unreadCountMap.value.get(canal.id) || 0
        unreadCountMap.value.set(canal.id, current + 1)
        unreadCountMap.value = new Map(unreadCountMap.value)
        const senderId = msg.personajeId
        const content = (msg.contenido || '').replace(/&#64;/g, '@')
        const anyMentioned = characterSessionStore.sesiones.value
          .filter((s: any) => s.personajeId !== senderId)
          .some((s: any) => content.includes(`@${s.personajeNombre}`))
        if (anyMentioned) {
          console.log('[DEBUG] mention detected in channel', canal.id, 'setting channelMentionedMap')
          channelMentionedMap.value.set(canal.id, true)
          channelMentionedMap.value = new Map(channelMentionedMap.value)
          reproducirSonidoPM()
        }
      }
    })
    wsSubscriptions.push(subMsgs)
  }
}

async function actualizarNoLeidos() {
  const activoId = canalActivo.value?.id ?? -1
  const promises = canalesUnidos.value
    .filter((c: any) => c.id !== activoId)
    .map(async (c: any) => {
      try {
        const { data } = await chatApi.obtenerMensajesCanal(c.id, 0, 1)
        const content: any[] = data.content || []
        if (content.length > 0) {
          const latestId = content[0].id
          if (latestId > (channelLastSeenIds.value[c.id] ?? 0)) {
            const current = unreadCountMap.value.get(c.id) || 0
            unreadCountMap.value.set(c.id, current + 1)
          }
        }
      } catch {}
    })
  await Promise.all(promises)
  unreadCountMap.value = new Map(unreadCountMap.value)
}

async function reconectarSesion() {
  await websocketService.disconnect()
  persistentSubscriptions.forEach(s => websocketService.unsubscribe(s))
  persistentSubscriptions = []
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  wsSubscriptions = []
  await conectarWebSocket()
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid) {
    const saved = sessionCache.get(pid)?.status
    if (saved && saved !== 'conectado') {
      try { await chatApi.actualizarStatus(pid, saved) } catch {}
    }
  }
  await cargarCanalesUnidos()
  suscribirCanales()
  if (canalActivo.value) {
    if (mensajes.value.length === 0) {
      try {
        const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, 0, PAGE_SIZE)
        const content: any[] = data.content || []
        hayMasMensajes.value = !data.last
        mensajes.value = content.reverse()
        scrollAlFinal()
      } catch { mensajes.value = [] }
    } else {
      scrollAlFinal()
    }
    cargarMiembrosOnline()
  }
  await actualizarNoLeidos()
}

function cambiarSesion(index: number) {
  if (index === characterSessionStore.sesionActualIdx.value) return
  guardarEstadoSesion()
  characterSessionStore.seleccionarSesion(index)
  channelMentionedMap.value = new Map()
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
  conversacionActiva.value = null
  canalActivo.value = canal
  unreadCountMap.value.set(canal.id, 0)
  unreadCountMap.value = new Map(unreadCountMap.value)
  channelMentionedMap.value.set(canal.id, false)
  channelMentionedMap.value = new Map(channelMentionedMap.value)
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
    if (content.length > 0) {
      channelLastSeenIds.value[canal.id] = content[content.length - 1].id
    }
  } catch (e: any) {
    if (e.response?.status === 403) errorMsg.value = 'No tienes acceso a este canal'
    else errorMsg.value = 'Error al cargar el canal'
  } finally {
    cargando.value = false
    scrollAlFinal()
  }
  cargarMiembrosOnline()
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

function handleKeydownPriv(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    enviarMensajePrivadoWs()
  }
}

function resetTextareaHeight() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
}

function handleMentionClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const anchor = target.closest('a')
  if (!anchor) return
  const href = anchor.getAttribute('href') || ''
  const match = href.match(/^profile:(\d+)$/)
  if (match) {
    e.preventDefault()
    verPerfil(parseInt(match[1]))
  }
}

function processDiceInMessage(html: string): string {
  return html.replace(/🎲\s*(\d+)d(\d+)/g, (_match, count, sides) => {
    const c = parseInt(count)
    const s = parseInt(sides)
    const rolls: number[] = []
    for (let i = 0; i < c; i++) {
      rolls.push(Math.floor(Math.random() * s) + 1)
    }
    const total = rolls.reduce((a, b) => a + b, 0)
    if (c === 1) {
      return `🎲 ${c}d${s} = ${total}`
    }
    return `🎲 ${c}d${s} = ${total} (${rolls.join('+')})`
  })
}

function processMentionsInMessage(html: string): string {
  const members = [...miembrosOnline.value]
  if (conversacionActiva.value?.personajeId) {
    members.push({
      personajeId: conversacionActiva.value.personajeId,
      personajeNombre: conversacionActiva.value.personajeNombre,
    })
  }
  if (members.length === 0) return html
  members.sort((a: any, b: any) => b.personajeNombre.length - a.personajeNombre.length)
  let result = html
  for (const m of members) {
    const escapedName = m.personajeNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|>|\\s)@${escapedName}(?=([.,!?;:\\s<]|$))`, 'g')
    result = result.replace(regex, `$1<a href="profile:${m.personajeId}">@${m.personajeNombre}</a>`)
  }
  return result
}

function obtenerContenidoEditor(): string {
  const el = editorRef.value
  if (!el) return ''
  let html = el.innerHTML
  html = html.replace(/<br>\s*$/, '')
  html = processDiceInMessage(html)
  html = processMentionsInMessage(html)
  return html === '<br>' ? '' : html
}

function limpiarEditor() {
  if (editorRef.value) editorRef.value.innerHTML = ''
  nuevoMensaje.value = ''
}

const FORMAT_TAGS: Record<string, string> = {
  bold: 'b',
  italic: 'i',
  strikeThrough: 's',
  underline: 'u',
  blockquote: 'blockquote',
  h3: 'h3',
  h4: 'h4',
}

function wrapSelection(tag: string) {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || sel.isCollapsed) return
  const range = sel.getRangeAt(0)
  const wrapper = document.createElement(tag)
  try {
    range.surroundContents(wrapper)
  } catch {
    const fragment = range.extractContents()
    wrapper.appendChild(fragment)
    range.insertNode(wrapper)
  }
  sel.removeAllRanges()
}

function execFormat(command: string) {
  if (command === 'spoiler') {
    const el = editorRef.value
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const details = document.createElement('details')
    const summary = document.createElement('summary')
    summary.textContent = 'Spoiler'
    details.appendChild(summary)
    try {
      range.surroundContents(details)
    } catch {
      const fragment = range.extractContents()
      details.appendChild(fragment)
      range.insertNode(details)
    }
    sel.removeAllRanges()
    return
  }
  const tag = FORMAT_TAGS[command]
  if (!tag) return
  wrapSelection(tag)
}

function clearFormat() {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || sel.isCollapsed) return
  const range = sel.getRangeAt(0)
  const text = range.extractContents()
  const textNode = document.createTextNode(text.textContent || '')
  range.insertNode(textNode)
  sel.removeAllRanges()
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function insertLink() {
  const sel = window.getSelection()
  const selectedText = sel.toString().trim()
  const url = prompt('URL:', 'https://')
  if (!url) return
  const linkText = selectedText || prompt('Texto del enlace:') || url
  if (!linkText) return
  const el = editorRef.value
  if (!el) return
  el.focus()
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.textContent = linkText
  range.insertNode(anchor)
  sel.removeAllRanges()
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const DICE_TYPES = [
  { label: 'd4', max: 4, icon: 'd4' },
  { label: 'd6', max: 6, icon: 'd6' },
  { label: 'd8', max: 8, icon: 'd8' },
  { label: 'd10', max: 10, icon: 'd10' },
  { label: 'd12', max: 12, icon: 'd12' },
  { label: 'd20', max: 20, icon: 'd20' },
  { label: 'd100', max: 100, icon: 'd100' },
]

const mostrarDicePicker = ref(false)
const diceCount = ref(1)
const diceQuantityOptions = [1, 2, 3, 4, 5]

function toggleDicePicker() {
  mostrarDicePicker.value = !mostrarDicePicker.value
  if (mostrarDicePicker.value) {
    diceCount.value = 1
    mostrarEmojiPicker.value = false
    mostrarMentionPicker.value = false
  }
}

function closeDicePicker() {
  mostrarDicePicker.value = false
}

function rollDice(count: number, sides: number): { total: number; rolls: number[] } {
  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1)
  }
  const total = rolls.reduce((a, b) => a + b, 0)
  return { total, rolls }
}

function insertDice(diceType: typeof DICE_TYPES[0]) {
  const notation = `${diceCount.value}${diceType.label}`
  const text = ` 🎲 ${notation} `
  const el = editorRef.value
  if (!el) return
  el.focus()
  document.execCommand('insertText', false, text)
  mostrarDicePicker.value = false
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const mostrarMentionPicker = ref(false)
const mentionSearch = ref('')
const mentionHighlightIndex = ref(-1)

const filteredMentions = computed(() => {
  const list = miembrosOnline.value
  if (!mentionSearch.value) return list
  const s = mentionSearch.value.toLowerCase()
  return list.filter((m: any) => m.personajeNombre.toLowerCase().includes(s))
})

function toggleMentionPicker() {
  mostrarMentionPicker.value = !mostrarMentionPicker.value
  if (mostrarMentionPicker.value) {
    mentionSearch.value = ''
    mentionHighlightIndex.value = 0
    mostrarEmojiPicker.value = false
    mostrarDicePicker.value = false
  }
}

function closeMentionPicker() {
  mostrarMentionPicker.value = false
  mentionSearch.value = ''
  mentionHighlightIndex.value = -1
}

function insertMention(nombre: string) {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    const node = sel.focusNode
    const offset = sel.focusOffset
    if (node && node.textContent) {
      const text = node.textContent
      const beforeCursor = text.slice(0, offset)
      const atIndex = beforeCursor.lastIndexOf('@')
      if (atIndex !== -1) {
        range.setStart(node, atIndex)
        range.setEnd(node, offset)
      }
    }
    range.deleteContents()
    const textNode = document.createTextNode(`@${nombre} `)
    range.insertNode(textNode)
    range.setStartAfter(textNode)
    sel.removeAllRanges()
    sel.addRange(range)
  } else {
    document.execCommand('insertText', false, `@${nombre} `)
  }
  mostrarMentionPicker.value = false
  mentionSearch.value = ''
  mentionHighlightIndex.value = -1
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const charsRestantes = computed(() => {
  const len = nuevoMensaje.value?.length ?? 0
  const max = 2000
  return { usado: len, max, porcentaje: Math.min(100, (len / max) * 100) }
})

function toggleAyudaEditor() {
  mostrarAyudaEditor.value = !mostrarAyudaEditor.value
}
function toggleEmojiPicker() {
  mostrarEmojiPicker.value = !mostrarEmojiPicker.value
  if (mostrarEmojiPicker.value) {
    categoriaEmojiActiva.value = 0
    mostrarDicePicker.value = false
    mostrarMentionPicker.value = false
  }
}

function closeEmojiPicker() {
  mostrarEmojiPicker.value = false
}

function insertEmoji(emoji: string) {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) {
      el.focus()
      const newRange = document.createRange()
      newRange.setStart(el, el.childNodes.length)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
    }
  }
  document.execCommand('insertText', false, emoji)
  addRecentEmoji(emoji)
  closeEmojiPicker()
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function getMentionSearch(): string {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return ''
  const node = sel.focusNode
  const offset = sel.focusOffset
  if (!node) return ''
  const text = node.textContent || ''
  const beforeCursor = text.slice(0, offset)
  const atIndex = beforeCursor.lastIndexOf('@')
  if (atIndex === -1) return ''
  return beforeCursor.slice(atIndex + 1)
}

function handleEditorKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (conversacionActiva.value) {
      enviarMensajePrivadoWs()
    } else {
      enviarMensaje()
    }
    return
  }
  if (e.key === '@') {
    setTimeout(() => {
      mentionSearch.value = ''
      mentionHighlightIndex.value = 0
      mostrarMentionPicker.value = true
      mostrarEmojiPicker.value = false
      mostrarDicePicker.value = false
    }, 0)
    return
  }
  if (mostrarMentionPicker.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const len = filteredMentions.value.length
      if (len > 0) {
        mentionHighlightIndex.value = (mentionHighlightIndex.value + 1) % len
      }
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const len = filteredMentions.value.length
      if (len > 0) {
        mentionHighlightIndex.value = (mentionHighlightIndex.value - 1 + len) % len
      }
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const idx = mentionHighlightIndex.value >= 0 ? mentionHighlightIndex.value : 0
      if (idx < filteredMentions.value.length) {
        insertMention(filteredMentions.value[idx].personajeNombre)
      }
      return
    }
    if (e.key === 'Escape') {
      mostrarMentionPicker.value = false
      mentionSearch.value = ''
      return
    }
    if (e.key === 'Backspace') {
      setTimeout(() => {
        mentionSearch.value = getMentionSearch()
        if (!mentionSearch.value && !getMentionSearch()) {
          mostrarMentionPicker.value = false
        }
      }, 0)
    }
  }
}

function onEditorInput() {
  const el = editorRef.value
  if (!el) return
  nuevoMensaje.value = el.innerText || ''
  if (mostrarMentionPicker.value) {
    mentionSearch.value = getMentionSearch()
  }
  const max = 2000
  if (nuevoMensaje.value.length > max) {
    el.innerText = nuevoMensaje.value.slice(0, max)
    nuevoMensaje.value = nuevoMensaje.value.slice(0, max)
    const range = document.createRange()
    const sel = window.getSelection()
    if (el.lastChild) {
      range.setStartAfter(el.lastChild)
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }
}

async function enviarMensaje() {
  const texto = obtenerContenidoEditor()
  console.log('[DEBUG] enviarMensaje - texto:', JSON.stringify(texto))
  if (!texto || enviando.value || !canalActivo.value) return
  channelMentionedMap.value.set(canalActivo.value.id, false)
  channelMentionedMap.value = new Map(channelMentionedMap.value)
  enviando.value = true
  const token = characterSessionStore.getToken()
  if (websocketService.connected.value && token) {
    websocketService.sendChannelMessage(canalActivo.value.id, texto)
    limpiarEditor()
    enviando.value = false
  } else {
    try {
      await chatApi.enviarMensajeCanal(canalActivo.value.id, texto)
      limpiarEditor()
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

const cargandoMiembrosOnline = ref(false)

async function cargarMiembrosOnline(silent = false) {
  if (!canalActivo.value) return
  if (!silent) cargandoMiembrosOnline.value = true
  try {
    const localActiveIds = new Set(characterSessionStore.sesiones.value.map(s => s.personajeId))
    const { data } = await chatApi.listarMiembros(canalActivo.value.id, 0, 100)
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
  } catch {} finally { cargandoMiembrosOnline.value = false }
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

  pollingInterval = window.setInterval(() => {
    cargarMiembrosOnline(true)
  }, 5000)
})

onUnmounted(() => {
  persistentSubscriptions.forEach(s => websocketService.unsubscribe(s))
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (pollingInterval != null) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
})
</script>

<template>
  <!-- Sin sesiones activas: selección de personajes -->
  <div v-if="characterSessionStore.sesiones.value.length === 0" class="chat-fullpage bg-gradient-selection d-flex flex-column align-items-center" style="overflow-y: auto;" @contextmenu.prevent>
    <div class="container my-auto" style="max-width: 720px;">
      <div class="text-center mb-4">
        <h1 class="fw-bold d-flex align-items-center justify-content-center gap-2">
          <img :src="logoUrl" height="100" alt="PlayLore" />
          <span class="text-muted fw-light">|</span>
          <span>Chat</span>
        </h1>
        <p v-if="personajes.length > 0" class="text-muted">Selecciona un personaje para iniciar sesión</p>
      </div>
      <div v-if="cargandoPersonajes" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
      <div v-else-if="personajes.length === 0" class="text-center py-5">
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
            <small class="text-muted d-block">{{ p.raza || '—' }}</small>
            <small class="text-muted d-block">{{ p.clase || '' }}</small>
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
  <div v-else class="chat-fullpage d-flex flex-column" @contextmenu.prevent>
    <!-- Barra de pestañas de personajes -->
    <div class="chat-tabs-bar d-flex align-items-center px-2 border-bottom bg-white flex-shrink-0">
      <button v-for="(sesion, idx) in characterSessionStore.sesiones.value"
              :key="sesion.tokenJwt"
              class="chat-tab d-flex align-items-center gap-2 px-3 py-2 border-0 bg-transparent"
              :class="{ active: idx === characterSessionStore.sesionActualIdx.value, 'chat-tab-unread': (noLeidosCharacter.get(sesion.personajeId) ?? 0) > 0 }"
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

        <!-- Mensajes Privados -->
        <div v-if="conversacionesPrivadas.length > 0" class="sidebar-pm border-bottom">
          <div class="px-3 py-2">
            <small class="fw-bold text-muted text-uppercase" style="font-size:0.65rem;">Mensajes Privados</small>
          </div>
          <div v-for="conv in conversacionesPrivadas" :key="conv.personajeId"
               class="channel-item position-relative d-flex align-items-center gap-3 px-3 py-2"
               :class="{ active: conversacionActiva?.personajeId === conv.personajeId, 'channel-unread': (noLeidosPriv.get(conv.personajeId) ?? 0) > 0 }"
               @click="seleccionarConversacion(conv)"
               @contextmenu.prevent="abrirContextMenuConversacion($event, conv)">
            <button class="conversation-close-btn btn border-0 p-0 position-absolute d-flex align-items-center justify-content-center"
                    @click.stop="eliminarConversacionDirecta(conv)" title="Eliminar conversación">
              <i class="bi bi-x" style="font-size:1.1rem;line-height:1;"></i>
            </button>
            <div class="position-relative flex-shrink-0">
              <img :src="avatarUrl(conv.personajeAvatar)" class="rounded-circle" width="32" height="32" style="object-fit:cover;" />
              <span v-if="(noLeidosPriv.get(conv.personajeId) ?? 0) > 0" class="unread-dot"></span>
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex align-items-center gap-2">
                <small class="fw-medium text-truncate d-block">{{ conv.personajeNombre }}</small>
                <span v-if="(noLeidosPriv.get(conv.personajeId) ?? 0) > 0" class="unread-count">{{ noLeidosPriv.get(conv.personajeId) }}</span>
              </div>
              <small class="text-muted text-truncate d-block" style="font-size:0.7rem;">{{ conv.ultimoMensaje }}</small>
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
                :class="{ active: canalActivo?.id === canal.id, 'channel-unread': (unreadCountMap.get(canal.id) ?? 0) > 0, 'channel-mentioned': channelMentionedMap.get(canal.id) ?? false }"
                @click="seleccionarCanal(canal)">
             <div class="position-relative flex-shrink-0">
               <img :src="canalAvatar(canal.nombre)" class="rounded-circle" width="32" height="32" />
               <span v-if="(unreadCountMap.get(canal.id) ?? 0) > 0" class="unread-dot"></span>
             </div>
              <div class="flex-grow-1 min-w-0">
                <div class="d-flex justify-content-between align-items-center">
                  <div class="d-flex align-items-center gap-2">
                    <small class="fw-medium text-truncate d-block">{{ canal.nombre }}</small>
                  </div>
                  <div class="d-flex align-items-center gap-1">
                    <span v-if="channelMentionedMap.get(canal.id) ?? false" class="mention-badge">@</span>
                    <span v-if="canal.miRol" class="badge bg-secondary" style="font-size:0.6rem;">{{ canal.miRol }}</span>
                  </div>
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
        <!-- Sin canal ni conversación seleccionada -->
        <div v-if="!canalActivo && !conversacionActiva" class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
          <i class="bi bi-chat-dots display-1 mb-3 opacity-25"></i>
          <h5>Selecciona un canal o conversación</h5>
          <p class="small">Elige un canal o una conversación privada de la barra lateral</p>
          <button class="btn btn-outline-primary btn-sm d-md-none" @click="sidebarVisible = true">
            <i class="bi bi-list me-1"></i> Mostrar canales
          </button>
        </div>

        <!-- Canal seleccionado -->
        <template v-else-if="canalActivo">
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
            <button class="btn btn-sm btn-outline-secondary" @click="mostrarConectados = !mostrarConectados" title="Conectados">
              <i class="bi bi-person-check"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" @click="salirDelCanal" title="Salir del canal">
              <i class="bi bi-box-arrow-left"></i>
            </button>
          </div>

          <!-- Mensajes -->
          <div ref="mensajesContainer" class="chat-mensajes flex-grow-1 p-3 overflow-auto"
               @scroll="handleScroll"
               @click="handleMentionClick">
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
                  <p v-else class="mb-0 mt-1" style="white-space:pre-wrap;word-break:break-word;" v-html="msg.contenido"></p>
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
          <div class="chat-input p-3 border-top bg-light position-relative">
            <div class="formatting-toolbar d-flex gap-1 px-2 py-1 border-bottom flex-wrap">
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('bold')" title="Negrita"><strong>B</strong></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('italic')" title="Cursiva"><em>I</em></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('strikeThrough')" title="Tachado"><s>S</s></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('underline')" title="Subrayado"><u>U</u></button>
              <span class="toolbar-divider"></span>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('blockquote')" title="Cita"><i class="bi bi-quote"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('h3')" title="Título H3"><strong>H3</strong></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('h4')" title="Título H4"><strong>H4</strong></button>
              <span class="toolbar-divider"></span>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleDicePicker" title="Dados"><i class="bi bi-dice-6"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleMentionPicker" title="Mencionar"><i class="bi bi-at"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="insertLink" title="Enlace"><i class="bi bi-link-45deg"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('spoiler')" title="Spoiler"><i class="bi bi-eye-slash"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="clearFormat" title="Limpiar formato"><i class="bi bi-eraser"></i></button>
              <span class="toolbar-divider"></span>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn emoji-btn" @mousedown.prevent="toggleEmojiPicker" title="Emojis">😊</button>
              <span class="toolbar-divider"></span>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleAyudaEditor" title="Ayuda"><strong>?</strong></button>
            </div>
            <div v-if="mostrarEmojiPicker" class="emoji-picker shadow rounded-3 border bg-white p-2">
              <div class="emoji-categories d-flex gap-1 mb-2 flex-wrap">
                <button v-for="(cat, ci) in emojiCategories" :key="ci"
                        class="emoji-cat-btn btn btn-sm border-0 px-2 py-1"
                        :class="{ active: categoriaEmojiActiva === ci }"
                        @mousedown.prevent="categoriaEmojiActiva = ci">
                  {{ cat.name }}
                </button>
              </div>
              <div class="emoji-grid">
                <button v-for="(emoji, ei) in emojiCategories[categoriaEmojiActiva]?.emojis" :key="ei"
                        class="emoji-item btn btn-sm border-0 p-1"
                        @mousedown.prevent="insertEmoji(emoji)"
                        :title="emoji">
                  {{ emoji }}
                </button>
              </div>
            </div>
            <div v-if="mostrarDicePicker" class="emoji-picker shadow rounded-3 border bg-white p-2" style="max-height:320px;">
              <div class="d-flex gap-2 align-items-center mb-2 px-1">
                <label class="small text-nowrap mb-0">Cantidad:</label>
                <select v-model="diceCount" class="form-select form-select-sm" style="width:auto;">
                  <option v-for="n in diceQuantityOptions" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <button v-for="dt in DICE_TYPES" :key="dt.label"
                        class="btn btn-sm btn-outline-secondary"
                        @mousedown.prevent="insertDice(dt)">
                  {{ dt.label }}
                </button>
              </div>
            </div>
            <form @submit.prevent="enviarMensaje" class="d-flex gap-2 align-items-end pt-2 position-relative">
              <div v-if="mostrarMentionPicker" class="mention-picker-inside shadow rounded-3 border bg-white p-2">
                <div v-if="filteredMentions.length === 0" class="text-muted small text-center py-2">No hay miembros disponibles</div>
                <button v-for="(m, mi) in filteredMentions" :key="m.id"
                        class="d-block w-100 text-start btn btn-sm border-0 px-2 py-1 mention-item"
                        :class="{ 'mention-highlight': mi === mentionHighlightIndex }"
                        @mousedown.prevent="insertMention(m.personajeNombre)"
                        @mouseenter="mentionHighlightIndex = mi">
                  <img :src="avatarUrl(m.personajeAvatar)" class="rounded-circle me-2" width="20" height="20" style="object-fit:cover;" />
                  {{ m.personajeNombre }}
                </button>
              </div>
              <div class="flex-grow-1 position-relative">
                <div ref="editorRef" contenteditable="true"
                     class="form-control form-control-sm chat-editor"
                     data-placeholder="Escribe un mensaje..."
                     @keydown="handleEditorKeydown"
                     @input="onEditorInput"></div>
                <div class="character-counter">
                  <span :class="charsRestantes.usado > charsRestantes.max * 0.9 ? 'text-danger fw-bold' : 'text-muted'">
                    {{ charsRestantes.usado }}/{{ charsRestantes.max }}
                  </span>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-sm flex-shrink-0"
                      :disabled="!nuevoMensaje.trim() || enviando">
                <i class="bi bi-send"></i>
              </button>
            </form>
          </div>
        </template>

        <!-- Conversación privada seleccionada -->
        <template v-if="conversacionActiva">
          <div class="chat-header d-flex align-items-center gap-3 px-3 py-2 border-bottom bg-light">
            <button class="btn btn-sm btn-outline-secondary" @click="cerrarConversacion" title="Cerrar">
              <i class="bi bi-arrow-left"></i>
            </button>
            <img :src="avatarUrl(conversacionActiva.personajeAvatar)" class="rounded-circle flex-shrink-0"
                 width="28" height="28" style="object-fit:cover;cursor:pointer;" @click="verPerfil(conversacionActiva.personajeId)" />
            <h6 class="mb-0 flex-grow-1 text-truncate" style="cursor:pointer;" @click="verPerfil(conversacionActiva.personajeId)">
              {{ conversacionActiva.personajeNombre }}
            </h6>
            <button class="btn btn-sm btn-outline-secondary" @click="verPerfil(conversacionActiva.personajeId)" title="Perfil">
              <i class="bi bi-person-vcard"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger ms-1" @click="cerrarConversacion" title="Cerrar conversación">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- PM Messages -->
          <div ref="mensajesContainer" class="chat-mensajes flex-grow-1 p-3 overflow-auto"
               @click="handleMentionClick">
            <div v-if="cargandoPriv" class="text-center py-5">
              <div class="spinner-border text-primary spinner-border-sm"></div>
            </div>
            <template v-else-if="mensajesPrivados.length > 0">
              <div v-for="msg in mensajesPrivados" :key="msg.id"
                   class="d-flex gap-2 mb-3"
                   :class="{ 'flex-row-reverse': msg.esMio }"
                   :style="msg.esMio ? 'margin-left:auto;max-width:85%;' : 'max-width:85%;'">
                <img :src="msg.esMio ? avatarUrl(characterSessionStore.sesionActual.value?.personajeAvatar) : avatarUrl(conversacionActiva.personajeAvatar)"
                     class="rounded-circle flex-shrink-0"
                     width="32" height="32" style="object-fit:cover;cursor:pointer;"
                     @click="verPerfil(msg.emisorId)" />
                <div class="mensaje-burbuja px-3 py-2" :class="msg.esMio ? 'bg-primary text-white' : 'bg-light'"
                     :style="msg.esMio ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'">
                  <p class="mb-0" style="white-space:pre-wrap;word-break:break-word;" v-html="msg.contenido"></p>
                  <small class="opacity-50 d-block text-end mt-1" style="font-size:0.65rem;">{{ formatFecha(msg.fechaEnvio) }}</small>
                </div>
              </div>
            </template>
            <div v-else class="text-center text-muted py-5">
              <i class="bi bi-chat-dots fs-1 d-block mb-2 opacity-50"></i>
              <p class="small">No hay mensajes aún. Envía un mensaje para iniciar la conversación.</p>
            </div>
          </div>

          <!-- PM Input -->
          <div class="chat-input p-3 border-top bg-light position-relative">
            <div class="formatting-toolbar d-flex gap-1 px-2 py-1 border-bottom flex-wrap">
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('bold')" title="Negrita"><strong>B</strong></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('italic')" title="Cursiva"><em>I</em></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('strikeThrough')" title="Tachado"><s>S</s></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('underline')" title="Subrayado"><u>U</u></button>
              <span class="toolbar-divider"></span>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('blockquote')" title="Cita"><i class="bi bi-quote"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('h3')" title="Título H3"><strong>H3</strong></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('h4')" title="Título H4"><strong>H4</strong></button>
              <span class="toolbar-divider"></span>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleDicePicker" title="Dados"><i class="bi bi-dice-6"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleMentionPicker" title="Mencionar"><i class="bi bi-at"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="insertLink" title="Enlace"><i class="bi bi-link-45deg"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('spoiler')" title="Spoiler"><i class="bi bi-eye-slash"></i></button>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="clearFormat" title="Limpiar formato"><i class="bi bi-eraser"></i></button>
              <span class="toolbar-divider"></span>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn emoji-btn" @mousedown.prevent="toggleEmojiPicker" title="Emojis">😊</button>
              <span class="toolbar-divider"></span>
              <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleAyudaEditor" title="Ayuda"><strong>?</strong></button>
            </div>
            <div v-if="mostrarEmojiPicker" class="emoji-picker shadow rounded-3 border bg-white p-2">
              <div class="emoji-categories d-flex gap-1 mb-2 flex-wrap">
                <button v-for="(cat, ci) in emojiCategories" :key="ci"
                        class="emoji-cat-btn btn btn-sm border-0 px-2 py-1"
                        :class="{ active: categoriaEmojiActiva === ci }"
                        @mousedown.prevent="categoriaEmojiActiva = ci">
                  {{ cat.name }}
                </button>
              </div>
              <div class="emoji-grid">
                <button v-for="(emoji, ei) in emojiCategories[categoriaEmojiActiva]?.emojis" :key="ei"
                        class="emoji-item btn btn-sm border-0 p-1"
                        @mousedown.prevent="insertEmoji(emoji)"
                        :title="emoji">
                  {{ emoji }}
                </button>
              </div>
            </div>
            <div v-if="mostrarDicePicker" class="emoji-picker shadow rounded-3 border bg-white p-2" style="max-height:320px;">
              <div class="d-flex gap-2 align-items-center mb-2 px-1">
                <label class="small text-nowrap mb-0">Cantidad:</label>
                <select v-model="diceCount" class="form-select form-select-sm" style="width:auto;">
                  <option v-for="n in diceQuantityOptions" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <button v-for="dt in DICE_TYPES" :key="dt.label"
                        class="btn btn-sm btn-outline-secondary"
                        @mousedown.prevent="insertDice(dt)">
                  {{ dt.label }}
                </button>
              </div>
            </div>
            <form @submit.prevent="enviarMensajePrivadoWs" class="d-flex gap-2 align-items-end pt-2 position-relative">
              <div v-if="mostrarMentionPicker" class="mention-picker-inside shadow rounded-3 border bg-white p-2">
                <div v-if="filteredMentions.length === 0" class="text-muted small text-center py-2">No hay miembros disponibles</div>
                <button v-for="(m, mi) in filteredMentions" :key="m.id"
                        class="d-block w-100 text-start btn btn-sm border-0 px-2 py-1 mention-item"
                        :class="{ 'mention-highlight': mi === mentionHighlightIndex }"
                        @mousedown.prevent="insertMention(m.personajeNombre)"
                        @mouseenter="mentionHighlightIndex = mi">
                  <img :src="avatarUrl(m.personajeAvatar)" class="rounded-circle me-2" width="20" height="20" style="object-fit:cover;" />
                  {{ m.personajeNombre }}
                </button>
              </div>
              <div class="flex-grow-1 position-relative">
                <div ref="editorRef" contenteditable="true"
                     class="form-control form-control-sm chat-editor"
                     data-placeholder="Escribe un mensaje..."
                     @keydown="handleEditorKeydown"
                     @input="onEditorInput"></div>
                <div class="character-counter">
                  <span :class="charsRestantes.usado > charsRestantes.max * 0.9 ? 'text-danger fw-bold' : 'text-muted'">
                    {{ charsRestantes.usado }}/{{ charsRestantes.max }}
                  </span>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-sm flex-shrink-0"
                      :disabled="!nuevoMensaje.trim() || enviando">
                <i class="bi bi-send"></i>
              </button>
            </form>
          </div>
        </template>
      </main>

      <!-- Right sidebar: connected characters -->
      <aside v-if="canalActivo && mostrarConectados" class="chat-right-sidebar border-start d-flex flex-column">
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h6 class="mb-0 small fw-bold">Conectados ({{ miembrosOnline.length }})</h6>
          <button class="btn-close btn-close-sm" @click="mostrarConectados = false"></button>
        </div>
        <div class="list-group list-group-flush overflow-auto flex-grow-1">
          <div v-if="cargandoMiembrosOnline" class="list-group-item text-center py-4">
            <div class="spinner-border spinner-border-sm text-secondary"></div>
          </div>
          <div v-else-if="miembrosOnline.length === 0" class="list-group-item text-muted text-center py-3">
            <small>No hay personajes conectados</small>
          </div>
          <div v-for="m in miembrosOnline" :key="m.id" class="list-group-item d-flex align-items-center gap-2"
               @contextmenu.prevent="abrirContextMenu($event, m)">
            <div class="position-relative" style="cursor:pointer;" @click="verPerfil(m.personajeId)">
              <img :src="avatarUrl(m.personajeAvatar)"
                   class="rounded-circle" width="32" height="32" style="object-fit: cover;" />
              <span class="online-dot" :style="{ background: getStatusColor(statusMap.get(m.personajeId)) }"></span>
            </div>
            <i v-if="m.rol === 'OWNER'" class="bi bi-key-fill text-warning"></i>
            <i v-else-if="m.rol === 'MOD'" class="bi bi-shield-fill-check text-success"></i>
            <small class="text-truncate" style="cursor:pointer;" @click="verPerfil(m.personajeId)">{{ m.personajeNombre }}</small>
          </div>
        </div>
      </aside>
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
            <small class="text-muted d-block" style="font-size:0.65rem;">{{ p.raza || '—' }}</small>
            <small class="text-muted d-block" style="font-size:0.65rem;">{{ p.clase || '' }}</small>
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

  <!-- Context menu: clic derecho en conectados -->
  <div v-if="contextMenuTarget" class="context-menu-overlay" @click="cerrarContextMenu" @contextmenu.prevent="cerrarContextMenu"></div>
  <div v-if="contextMenuTarget" class="context-menu" :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }" @contextmenu.prevent>
    <button class="context-menu-item" @click="verPerfil(contextMenuTarget.personajeId); cerrarContextMenu()">
      <i class="bi bi-person-vcard me-2"></i> Perfil
    </button>
    <button class="context-menu-item" @click="abrirConversacionPrivada(contextMenuTarget.personajeId, contextMenuTarget.personajeNombre, contextMenuTarget.personajeAvatar)">
      <i class="bi bi-envelope me-2"></i> Mensaje Privado
    </button>
    <div v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN') && contextMenuTarget.rol === 'MEMBER'" class="context-menu-divider"></div>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN') && contextMenuTarget.rol === 'MEMBER'"
            class="context-menu-item" @click="ascenderAMod(contextMenuTarget)">
      <i class="bi bi-shield me-2"></i> Ascender a moderador
    </button>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN' || miRolEnCanal === 'MOD')
                  && contextMenuTarget.personajeId !== characterSessionStore.sesionActual.value?.personajeId
                  && contextMenuTarget.rol !== 'OWNER' && contextMenuTarget.rol !== 'ADMIN'"
            class="context-menu-item text-danger" @click="expulsarDelCanal(contextMenuTarget)">
      <i class="bi bi-door-open me-2"></i> Expulsar del canal
    </button>
  </div>

  <!-- Picker overlays -->
  <div v-if="mostrarEmojiPicker" class="context-menu-overlay" @click="closeEmojiPicker" @contextmenu.prevent="closeEmojiPicker"></div>
  <div v-if="mostrarDicePicker" class="context-menu-overlay" @click="closeDicePicker" @contextmenu.prevent="closeDicePicker"></div>
  <div v-if="mostrarMentionPicker" class="context-menu-overlay" @click="closeMentionPicker" @contextmenu.prevent="closeMentionPicker"></div>

  <!-- Modal: Ayuda del editor -->
  <div v-if="mostrarAyudaEditor" class="modal-backdrop-custom" @click.self="mostrarAyudaEditor = false">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:480px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-question-circle me-2"></i>Ayuda del editor</h5>
        <button class="btn-close" @click="mostrarAyudaEditor = false"></button>
      </div>
      <div class="help-grid">
        <div class="help-item"><span class="help-key"><strong>B</strong></span><span>Negrita</span></div>
        <div class="help-item"><span class="help-key"><em>I</em></span><span>Cursiva</span></div>
        <div class="help-item"><span class="help-key"><s>S</s></span><span>Tachado</span></div>
        <div class="help-item"><span class="help-key"><u>U</u></span><span>Subrayado</span></div>
        <div class="help-item"><span class="help-key"><i class="bi bi-quote"></i></span><span>Cita en bloque</span></div>
        <div class="help-item"><span class="help-key"><strong>H3</strong></span><span>Encabezado grande</span></div>
        <div class="help-item"><span class="help-key"><strong>H4</strong></span><span>Encabezado pequeño</span></div>
        <div class="help-item"><span class="help-key"><i class="bi bi-dice-6"></i></span><span>Insertar dados (se lanzan al enviar)</span></div>
        <div class="help-item"><span class="help-key"><i class="bi bi-at"></i></span><span>Mencionar personaje — escribe <code>@</code> en el editor o usa este botón; navega con <kbd>↑</kbd><kbd>↓</kbd> y pulsa <kbd>Tab</kbd> o <kbd>Enter</kbd> para seleccionar</span></div>
        <div class="help-item"><span class="help-key"><i class="bi bi-link-45deg"></i></span><span>Insertar enlace</span></div>
        <div class="help-item"><span class="help-key"><i class="bi bi-eye-slash"></i></span><span>Spoiler — texto oculto (clic para revelar)</span></div>
        <div class="help-item"><span class="help-key"><i class="bi bi-eraser"></i></span><span>Limpiar formato</span></div>
        <div class="help-item"><span class="help-key">😊</span><span>Emojis — selecciona un emoji para insertarlo</span></div>
      </div>
      <div class="text-muted small mt-3">
        También puedes usar <kbd>Tab</kbd> para completar una mención si hay resultados disponibles.
      </div>
    </div>
  </div>

  <!-- Context menu: clic derecho en conversaciones privadas -->
  <div v-if="conversacionCtxTarget" class="context-menu-overlay" @click="cerrarContextMenuConversacion" @contextmenu.prevent="cerrarContextMenuConversacion"></div>
  <div v-if="conversacionCtxTarget" class="context-menu" :style="{ left: conversacionCtxX + 'px', top: conversacionCtxY + 'px' }" @contextmenu.prevent>
    <button class="context-menu-item text-danger" @click="eliminarConversacionPrivada">
      <i class="bi bi-trash3 me-2"></i> Eliminar conversación
    </button>
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
.chat-tab.chat-tab-unread {
  background: #fff9c4 !important;
}
.chat-tab.chat-tab-unread:hover {
  background: #fff59d !important;
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

.conversation-close-btn {
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #6c757d;
  opacity: 0;
  z-index: 2;
  transition: opacity 0.1s;
}
.channel-item:hover .conversation-close-btn { opacity: 1; }
.channel-item:hover .conversation-close-btn:hover {
  background: #dee2e6;
  color: #212529;
}
.sidebar-pm .channel-item:hover .unread-dot { display: none; }
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

/* Chat editor (contentEditable) */
.chat-editor {
  min-height: 42px;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.5;
  padding: 8px 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.chat-editor:empty:before {
  content: attr(data-placeholder);
  color: #6c757d;
  pointer-events: none;
}
.chat-editor:focus {
  outline: none;
  box-shadow: none;
  border-color: #86b7fe;
}

/* Formatting toolbar */
.formatting-toolbar {
  background: #f8f9fa;
  border-radius: 6px 6px 0 0;
}
.fmt-btn {
  width: 30px;
  height: 28px;
  padding: 0;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.fmt-btn:hover {
  background: #e2e6ea !important;
}
.fmt-btn strong, .fmt-btn em, .fmt-btn s, .fmt-btn u {
  font-size: 0.85rem;
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
.mensaje-burbuja :deep(blockquote) {
  border-left: 3px solid #adb5bd;
  padding-left: 10px;
  margin: 6px 0;
  color: #495057;
  font-style: italic;
}
.mensaje-burbuja.bg-primary :deep(blockquote) {
  border-left-color: rgba(255,255,255,0.5);
  color: inherit;
}
.mensaje-burbuja :deep(h3) {
  font-size: 1.1rem;
  margin: 8px 0 4px;
  font-weight: 600;
}
.mensaje-burbuja :deep(h4) {
  font-size: 1rem;
  margin: 6px 0 3px;
  font-weight: 600;
}
.mensaje-burbuja :deep(details) {
  margin: 6px 0;
}
.mensaje-burbuja :deep(summary) {
  cursor: pointer;
  font-weight: 600;
  color: #0d6efd;
}
.mensaje-burbuja :deep(details[open]) {
  padding: 6px 8px;
  background: rgba(0,0,0,0.03);
  border-radius: 6px;
}

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

/* Right sidebar */
.chat-right-sidebar {
  width: 240px;
  min-width: 240px;
  background: #f8f9fa;
  height: 100%;
  overflow: hidden;
}
@media (max-width: 991.98px) {
  .chat-right-sidebar {
    display: none;
  }
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

/* Emoji picker */
.emoji-picker {
  position: absolute;
  bottom: 100%;
  left: 1rem;
  right: 1rem;
  max-height: 280px;
  overflow-y: auto;
  z-index: 1072;
  margin-bottom: 4px;
}
.emoji-categories {
  border-bottom: 1px solid #eee;
  padding-bottom: 0.25rem;
}
.emoji-cat-btn {
  font-size: 0.7rem;
  border-radius: 12px;
  color: #555;
  white-space: nowrap;
}
.emoji-cat-btn.active {
  background: #e8f0fe;
  color: #0d6efd;
  font-weight: 600;
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
}
.emoji-item {
  font-size: 1.3rem;
  cursor: pointer;
  border-radius: 4px;
  text-align: center;
  line-height: 1;
  padding: 2px !important;
  transition: background 0.1s;
}
.emoji-item:hover {
  background: #e9ecef;
}

/* Toolbar extras */
.toolbar-divider {
  width: 1px;
  background: #dee2e6;
  margin: 0 2px;
  align-self: stretch;
}
.fmt-btn .bi {
  font-size: 0.9rem;
  vertical-align: middle;
}

/* Character counter */
.character-counter {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 0.65rem;
  pointer-events: none;
  line-height: 1;
}
.chat-editor {
  padding-bottom: 18px !important;
}

/* Mention item */
.mention-item {
  border-radius: 4px;
  font-size: 0.85rem;
}
.mention-item:hover {
  background: #e8f0fe !important;
}
.mention-highlight,
.mention-item.mention-highlight:hover {
  background: #d0e4fc !important;
}
.mensaje-burbuja :deep(a[href^="profile:"]) {
  color: #0d6efd;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.mensaje-burbuja :deep(a[href^="profile:"]:hover) {
  text-decoration: underline;
}
.mensaje-burbuja.bg-primary :deep(a[href^="profile:"]) {
  color: #cfe2ff;
}
.mention-picker-inside {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 60px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 1072;
  margin-bottom: 4px;
}
.channel-mentioned {
  background: #fffbe6 !important;
}
.mention-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #dc3545;
  color: #fff;
  font-weight: 700;
  font-size: 0.65rem;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  line-height: 1;
}
.help-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.help-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 0.85rem;
  border-bottom: 1px solid #f0f0f0;
}
.help-item:last-child {
  border-bottom: none;
}
.help-key {
  flex-shrink: 0;
  width: 32px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 0.8rem;
}
.help-key .bi {
  font-size: 0.95rem;
}
.help-grid kbd {
  background: #222;
  color: #fff;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 0.7rem;
  border: none;
}
</style>

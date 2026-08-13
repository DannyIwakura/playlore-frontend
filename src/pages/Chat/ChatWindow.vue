<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { userStore } from '../../store/userStore'
import { characterSessionStore } from '../../store/characterSessionStore'
import { websocketService } from '../../services/websocket'
import { chatApi } from '../../services/chatApi'
import api from '../../services/api'
import PerfilPersonajeView from '../Personajes/PerfilPersonajeView.vue'
import logoUrl from '../../assets/img/lOGOpLAYlORE.png'
import { statusOptions, getStatusColor, avatarUrl, canalAvatar, formatFecha, sortByRole, solicitarPermisoNotificacion, notificarPush, truncarTexto, copiarTexto } from './chatUtils'
import ChatEditor from './ChatEditor.vue'
import ChatMessage from './ChatMessage.vue'
import ExpandableText from '../../components/ExpandableText.vue'
import ModalAviso from '../../components/ModalAviso.vue'

const router = useRouter()

const personajes = ref<any[]>([])
const cargandoPersonajes = ref(true)
const canalesUnidos = ref<any[]>([])
const cargandoCanales = ref(true)
const canalActivo = ref<any>(null)
const mensajes = ref<any[]>([])
const miembros = ref<any[]>([])
const miembrosOnline = ref<any[]>([])
const onlineMap = ref<Map<number, boolean>>(new Map())
const cargando = ref(true)
const enviando = ref(false)
const mensajesContainer = ref<HTMLElement | null>(null)
const sidebarVisible = ref(window.innerWidth >= 768)
const mostrarConectados = ref(true)
const esMobile = () => window.innerWidth < 768
const errorMsg = ref('')

const PAGE_SIZE = 15
const pagina = ref(0)
const cargandoMas = ref(false)
const hayMasMensajes = ref(true)
const usuarioScrolledUp = ref(false)

const mensajeEnRespuesta = ref<any | null>(null)
const modoEdicion = ref<any | null>(null)
const mensajeDestacado = ref<number | null>(null)
const chatEditorRef = ref<InstanceType<typeof ChatEditor> | null>(null)

const statusMap = ref<Map<number, string>>(new Map())
const estadoActual = computed(() => statusMap.value.get(characterSessionStore.sesionActual.value?.personajeId ?? -1) ?? 'conectado')
const mostrarSelectorEstado = ref(false)

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
const imagenCanal = ref<File | null>(null)
const imagenPreview = ref<string | null>(null)
const inputImagenRef = ref<HTMLInputElement | null>(null)

const mostrarModalEditarCanal = ref(false)
const editarCanalData = ref({ nombre: '', descripcion: '', privado: false })
const errorEditarCanal = ref('')
const imagenEdicionCanal = ref<File | null>(null)
const imagenEdicionPreview = ref<string | null>(null)
const quitarImagenEdicion = ref(false)
const inputImagenEdicionRef = ref<HTMLInputElement | null>(null)
const mostrarEliminarCanal = ref(false)
const passwordEliminarCanal = ref('')
const errorEliminarCanal = ref('')
const eliminandoCanal = ref(false)

const imagenEdicionSrc = computed(() => {
  const p = imagenEdicionPreview.value
  if (!p) return ''
  if (p.startsWith('blob:') || p.startsWith('data:') || p.startsWith('http')) return p
  return canalAvatar({ nombre: editarCanalData.value.nombre, imagenUrl: p })
})

async function onImagenCanalChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  imagenCanal.value = file
  const error = await validarImagenCanal(file)
  if (error) {
    errorCrear.value = error
    return
  }
  if (imagenPreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagenPreview.value)
  imagenPreview.value = URL.createObjectURL(file)
  errorCrear.value = ''
}

function quitarImagenCanal() {
  imagenCanal.value = null
  if (imagenPreview.value) URL.revokeObjectURL(imagenPreview.value)
  imagenPreview.value = null
  errorCrear.value = ''
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

async function validarImagenCanal(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Formato no permitido. Solo JPG, PNG y WEBP'
  }
  if (file.size > 10 * 1024 * 1024) {
    return 'La imagen no puede superar 10 MB'
  }
  const dims = await obtenerDimensionesImagen(file)
  if (!dims) {
    return 'El archivo no es una imagen válida'
  }
  if (dims.width > 400 || dims.height > 400) {
    return `La imagen no puede superar 400x400 píxeles (la actual tiene ${dims.width}x${dims.height}). Reduce su tamaño o recorta la imagen antes de subirla.`
  }
  return null
}

function extraerError(e: any, fallback: string): string {
  const data = e?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  return data.error || data.message || data.mensaje || data.imagenFile || fallback
}

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

async function eliminarConversacionDeLista(conv: any) {
  try {
    await chatApi.eliminarConversacion(conv.personajeId)
  } catch {
    return
  }
  if (conversacionActiva.value?.personajeId === conv.personajeId) {
    cerrarConversacion()
  }
  conversacionesPrivadas.value = conversacionesPrivadas.value.filter(
    c => c.personajeId !== conv.personajeId
  )
  noLeidosPriv.value.delete(conv.personajeId)
  noLeidosPriv.value = new Map(noLeidosPriv.value)
}

const miRolEnCanal = computed(() => canalActivo.value?.miRol)

async function ascenderAMod(m: any) {
  cerrarContextMenu()
  mostrarConfirmModal('Ascender a moderador', `¿Ascender a ${m.personajeNombre} a moderador?`, async () => {
    try {
      await chatApi.cambiarRol(canalActivo.value!.id, m.personajeId, 'MOD')
      await cargarMiembrosOnline()
    } catch {}
  })
}

async function descenderAMember(m: any) {
  cerrarContextMenu()
  mostrarConfirmModal('Descender a miembro', `¿Descender a ${m.personajeNombre} a miembro?`, async () => {
    try {
      await chatApi.cambiarRol(canalActivo.value!.id, m.personajeId, 'MEMBER')
      await cargarMiembrosOnline()
    } catch {}
  })
}

async function expulsarDelCanal(m: any) {
  cerrarContextMenu()
  mostrarConfirmModal('Expulsar del canal', `¿Expulsar a ${m.personajeNombre} del canal?`, async () => {
    try {
      await chatApi.expulsarMiembro(canalActivo.value!.id, m.personajeId)
      await cargarMiembrosOnline()
    } catch {}
  })
}

const denunciaTarget = ref<{ tipo: 'MENSAJE_CANAL' | 'CANAL', tipoId: number } | null>(null)
const denunciaMotivo = ref('')
const denunciaDetalle = ref('')
const enviandoDenuncia = ref(false)

function denunciarMensaje(msg: any) {
  cerrarContextMenu()
  denunciaTarget.value = { tipo: 'MENSAJE_CANAL', tipoId: msg.id }
  denunciaMotivo.value = ''
  denunciaDetalle.value = ''
}

function denunciarCanalActivo() {
  if (!canalActivo.value) return
  denunciaTarget.value = { tipo: 'CANAL', tipoId: canalActivo.value.id }
  denunciaMotivo.value = ''
  denunciaDetalle.value = ''
}

const aviso = ref<string | null>(null)

async function enviarDenunciaMensaje() {
  if (!denunciaTarget.value) return
  if (!denunciaMotivo.value.trim()) {
    aviso.value = 'El motivo es obligatorio para enviar la denuncia.'
    return
  }
  enviandoDenuncia.value = true
  try {
    await api.post('/denuncias', {
      tipo: denunciaTarget.value.tipo,
      tipoId: denunciaTarget.value.tipoId,
      motivo: denunciaMotivo.value.trim(),
      detalle: denunciaDetalle.value.trim() || null,
    })
    denunciaTarget.value = null
    denunciaMotivo.value = ''
    denunciaDetalle.value = ''
    aviso.value = 'Denuncia enviada. Gracias por ayudar a mantener el canal seguro.'
  } catch (e: any) {
    const data = e?.response?.data
    const mensaje = data?.error || data?.message || data?.mensaje || 'Error al enviar la denuncia.'
    aviso.value = mensaje
  } finally {
    enviandoDenuncia.value = false
  }
}

const banTarget = ref<any>(null)
const banDuracion = ref('PERMANENTE')

function abrirBanModal(m: any) {
  cerrarContextMenu()
  banTarget.value = m
  banDuracion.value = 'PERMANENTE'
}

async function confirmarBan() {
  if (!banTarget.value || !canalActivo.value) return
  try {
    await chatApi.banearMiembro(canalActivo.value.id, banTarget.value.personajeId, banDuracion.value)
    banTarget.value = null
    await cargarMiembrosOnline()
  } catch {}
}

const opcionesBan = [
  { value: '1H', label: '1 hora' },
  { value: '24H', label: '24 horas' },
  { value: '7D', label: '7 días' },
  { value: 'PERMANENTE', label: 'Permanente' },
]

// Modal de baneados del canal
const mostrarBaneados = ref(false)
const baneados = ref<any[]>([])
const cargandoBaneados = ref(false)

async function abrirModalBaneados() {
  if (!canalActivo.value) return
  mostrarBaneados.value = true
  cargandoBaneados.value = true
  try {
    const { data } = await chatApi.listarBaneados(canalActivo.value.id)
    baneados.value = data
  } catch {
    baneados.value = []
  } finally {
    cargandoBaneados.value = false
  }
}

function desbanearPersonaje(p: any) {
  if (!canalActivo.value) return
  mostrarConfirmModal(
    'Desbanear personaje',
    `¿Desbanear a ${p.personajeNombre} de este canal?`,
    async () => {
      try {
        await chatApi.desbanearMiembro(canalActivo.value!.id, p.personajeId)
        baneados.value = baneados.value.filter((b: any) => b.personajeId !== p.personajeId)
      } catch {
        aviso.value = 'Error al desbanear al personaje.'
      }
    }
  )
}

// Private messages
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
    noLeidosPriv.value = new Map(
      Array.from(grouped.values()).map(c => [c.personajeId, c.noLeidos])
    )
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

function enviarMensajePrivadoWs(texto: string) {
  if (!texto || !conversacionActiva.value) return
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
    notificarPush('Mensaje privado', truncarTexto(texto))
  }
  const conv = conversacionesPrivadas.value.find(c => c.personajeId === receptorId)
  if (conv) { conv.ultimoMensaje = texto; conv.fecha = tempMsg.fechaEnvio }
}

function handleSendPm(texto: string) {
  enviarMensajePrivadoWs(texto)
}

const mostrarConfirmacionDesconectar = ref(false)
const mensajeModal = ref<{ titulo: string; texto: string } | null>(null)
function mostrarMensajeModal(titulo: string, texto: string) { mensajeModal.value = { titulo, texto } }
const confirmModal = ref<{ titulo: string; texto: string; onConfirm: () => void } | null>(null)
function mostrarConfirmModal(titulo: string, texto: string, onConfirm: () => void) { confirmModal.value = { titulo, texto, onConfirm } }
const personajeDesconectarIdx = ref(-1)

const mostrarConfirmacionEliminar = ref(false)
const mensajeAEliminarId = ref<number | null>(null)

const mostrarSelectorPersonajes = ref(false)

const unreadCountMap = ref<Map<number, number>>(new Map())
const channelMentionedMap = ref<Map<number, boolean>>(new Map())
const channelLastSeenIds = ref<Record<number, number>>({})

const mostrarListaMiembros = ref(false)
const miembrosLista = ref<any[]>([])
const paginaMiembros = ref(0)
const cargandoMiembros = ref(false)
const hayMasMiembros = ref(true)

const cualquierModalAbierto = computed(() =>
  mostrarListaMiembros.value || mostrarSelectorPersonajes.value || mostrarListaCanales.value ||
  mostrarModalCrear.value || mostrarModalEditarCanal.value || mostrarPerfil.value ||
  mostrarConfirmacionDesconectar.value || !!mensajeModal.value || !!confirmModal.value ||
  mostrarConfirmacionEliminar.value || !!banTarget.value || !!denunciaTarget.value
)
watch(cualquierModalAbierto, (abierto) => {
  if (abierto) window.dispatchEvent(new CustomEvent('pl:modal-abierto'))
})

let wsSubscriptions: string[] = []
let persistentSubscriptions: string[] = []
let channelPresenceSubscription: string | null = null
let pollingInterval: number | null = null

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
      params: { page: 0, size: 50 },
      timeout: 10000
    })
    personajes.value = data.content || data
  } catch {
    personajes.value = []
  } finally { cargandoPersonajes.value = false }
}

async function iniciarSesionPersonaje(personajeId: number) {
  try {
    guardarEstadoSesion()
    await characterSessionStore.iniciarSesion(personajeId)
    mostrarSelectorPersonajes.value = false
    canalActivo.value = null
    conversacionActiva.value = null
    mensajes.value = []
    mensajesPrivados.value = []
    miembros.value = []
    miembrosOnline.value = []
    canalesUnidos.value = []
    conversacionesPrivadas.value = []
    unreadCountMap.value = new Map()
    noLeidosPriv.value = new Map()
    channelMentionedMap.value = new Map()
    channelLastSeenIds.value = {}
    cargandoCanales.value = true
    persistentSubscriptions.forEach(s => websocketService.unsubscribe(s))
    persistentSubscriptions = []
    wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
    wsSubscriptions = []
    if (channelPresenceSubscription) {
      websocketService.unsubscribe(channelPresenceSubscription)
      channelPresenceSubscription = null
    }
    await websocketService.disconnect()
    await conectarWebSocket()
    await cargarCanalesUnidos()
    suscribirCanales()
  } catch (e: any) {
    console.error('[Chat] Error al conectar personaje:', e)
    mostrarMensajeModal('Error', e.response?.data?.error || e.message || 'Error al iniciar sesión')
    if (characterSessionStore.sesiones.value.length === 0) {
      mostrarSelectorPersonajes.value = true
    }
  }
}

function confirmarDesconectar(idx: number) {
  personajeDesconectarIdx.value = idx
  mostrarConfirmacionDesconectar.value = true
}

async function ejecutarDesconectar() {
  const idx = personajeDesconectarIdx.value
  mostrarConfirmacionDesconectar.value = false
  personajeDesconectarIdx.value = -1
  if (idx >= 0) {
    if (idx !== characterSessionStore.sesionActualIdx.value) {
      guardarEstadoSesion()
      characterSessionStore.seleccionarSesion(idx)
    }
    await cerrarSesionPersonaje()
  }
}

const personajeDesconectar = computed(() => {
  if (personajeDesconectarIdx.value < 0) return null
  return characterSessionStore.sesiones.value[personajeDesconectarIdx.value] || null
})

async function cerrarSesionPersonaje() {
  guardarEstadoSesion()
  const closedPersonajeId = characterSessionStore.sesionActual.value?.personajeId
  try { await websocketService.disconnect() } catch {}
  try { await characterSessionStore.cerrarSesionActual() } catch {}
  if (closedPersonajeId != null) {
    onlineMap.value.set(closedPersonajeId, false)
    onlineMap.value = new Map(onlineMap.value)
  }
  canalActivo.value = null
  mensajes.value = []
  miembros.value = []
  canalesUnidos.value = []
  if (channelPresenceSubscription) {
    websocketService.unsubscribe(channelPresenceSubscription)
    channelPresenceSubscription = null
  }
  if (characterSessionStore.sesiones.value.length > 0) {
    const conCache = restaurarEstadoSesion()
    try { await reconectarSesion(conCache) } catch {}
  }
}

async function cerrarTodasSesiones() {
  try { await websocketService.disconnect() } catch {}
  try { await characterSessionStore.cerrarTodas() } catch {
    characterSessionStore.sesiones.value = []
    characterSessionStore.sesionActualIdx.value = 0
  }
  canalActivo.value = null
  mensajes.value = []
  miembros.value = []
  canalesUnidos.value = []
  if (channelPresenceSubscription) {
    websocketService.unsubscribe(channelPresenceSubscription)
    channelPresenceSubscription = null
  }
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
      if (data.tipo === 'EXPULSADO' || data.tipo === 'BANEADO' || data.tipo === 'CANAL_ELIMINADO') {
        const canalIdExp = data.canalId
        canalesUnidos.value = canalesUnidos.value.filter((c: any) => c.id !== canalIdExp)
        canalesOficiales.value = canalesOficiales.value.filter((c: any) => c.id !== canalIdExp)
        canalesUsuarios.value = canalesUsuarios.value.filter((c: any) => c.id !== canalIdExp)
        if (canalActivo.value?.id === canalIdExp) {
          canalActivo.value = null
          mensajes.value = []
          miembros.value = []
        }
        unreadCountMap.value.delete(canalIdExp)
        unreadCountMap.value = new Map(unreadCountMap.value)
        websocketService.unsubscribe(`channel-${canalIdExp}`)
        websocketService.unsubscribe(`channel-presence-${canalIdExp}`)
        return
      }
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
          notificarPush('Mensaje privado', truncarTexto(data.contenido || ''))
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
        notificarPush(data.emisorNombre || 'Mensaje privado', truncarTexto(data.contenido || ''))
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
  conversacionActiva?: any
  mensajesPrivados?: any[]
  conversacionesPrivadas?: any[]
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
    conversacionesPrivadas: conversacionesPrivadas.value,
  })
}

function restaurarEstadoSesion(): boolean {
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid == null) return false
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
    conversacionesPrivadas.value = cached.conversacionesPrivadas || []
    if (canalActivo.value && !canalesUnidos.value.some((c: any) => c.id === canalActivo.value.id)) {
      canalActivo.value = null
      mensajes.value = []
    }
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
    conversacionesPrivadas.value = []
  }
  noLeidosPriv.value = new Map()
  unreadCountMap.value = new Map()
  return !!cached
}

function suscribirCanales() {
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  wsSubscriptions = []
  for (const canal of canalesUnidos.value) {
    const subMsgs = websocketService.subscribeToChannel(canal.id, (msg: any) => {
      const pid = characterSessionStore.sesionActual.value?.personajeId
      msg.esMio = msg.personajeId === pid
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
        if (msg.id > (channelLastSeenIds.value[canal.id] ?? 0)) {
          channelLastSeenIds.value[canal.id] = msg.id
        }
      } else {
        if (msg.eliminado) return
        const current = unreadCountMap.value.get(canal.id) || 0
        unreadCountMap.value.set(canal.id, current + 1)
        unreadCountMap.value = new Map(unreadCountMap.value)
        const content = (msg.contenido || '').replace(/&#64;/g, '@')
        const anyMentioned = characterSessionStore.sesiones.value
          .filter((s: any) => s.personajeId !== msg.personajeId)
          .some((s: any) => content.includes(`@${s.personajeNombre}`))
        if (anyMentioned) {
          channelMentionedMap.value.set(canal.id, true)
          channelMentionedMap.value = new Map(channelMentionedMap.value)
          reproducirSonidoPM()
          notificarPush('Te mencionaron en #' + (canal.nombre || 'canal'), truncarTexto(msg.contenido || ''))
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
        const ultimo = content[0]
        if (ultimo && !ultimo.eliminado && ultimo.id > (channelLastSeenIds.value[c.id] ?? 0)) {
          const current = unreadCountMap.value.get(c.id) || 0
          unreadCountMap.value.set(c.id, current + 1)
        }
      } catch {}
    })
  await Promise.all(promises)
  unreadCountMap.value = new Map(unreadCountMap.value)
}

async function refrescarMensajesActivos() {
  if (!canalActivo.value || canalActivo.value.id == null) return
  try {
    const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, 0, PAGE_SIZE)
    const content: any[] = data.content || []
    const servidor = new Map(content.map((m: any) => [m.id, m]))
    const pid = characterSessionStore.sesionActual.value?.personajeId
    const nuevo: any[] = []
    for (const m of mensajes.value) {
      const srv = servidor.get(m.id)
      if (srv) {
        srv.esMio = srv.personajeId === pid
        nuevo.push(srv)
        servidor.delete(m.id)
      } else {
        nuevo.push(m)
      }
    }
    const nuevosArr = [...servidor.values()]
      .map((m: any) => { m.esMio = m.personajeId === pid; return m })
      .sort((a: any, b: any) => new Date(a.fechaEnvio).getTime() - new Date(b.fechaEnvio).getTime())
    for (const m of nuevosArr) {
      const idx = nuevo.findIndex((x: any) => new Date(x.fechaEnvio).getTime() > new Date(m.fechaEnvio).getTime())
      if (idx >= 0) nuevo.splice(idx, 0, m)
      else nuevo.push(m)
    }
    mensajes.value = nuevo
  } catch {}
}

async function reconectarSesion(conCache = false) {
  await websocketService.disconnect()
  persistentSubscriptions.forEach(s => websocketService.unsubscribe(s))
  persistentSubscriptions = []
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  wsSubscriptions = []
  if (channelPresenceSubscription) {
    websocketService.unsubscribe(channelPresenceSubscription)
    channelPresenceSubscription = null
  }
  await conectarWebSocket()
  const pid = characterSessionStore.sesionActual.value?.personajeId
  if (pid) {
    const saved = sessionCache.get(pid)?.status
    if (saved && saved !== 'conectado') {
      try { await chatApi.actualizarStatus(pid, saved) } catch {}
    }
  }
  if (conCache) {
    cargandoCanales.value = false
  } else {
    await cargarCanalesUnidos()
  }
  await cargarConversaciones()
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
      await refrescarMensajesActivos()
      scrollAlFinal()
    }
    cargarMiembrosOnline()
  }
  await actualizarNoLeidos()
}

async function cambiarSesion(index: number) {
  if (index === characterSessionStore.sesionActualIdx.value) return
  guardarEstadoSesion()
  characterSessionStore.seleccionarSesion(index)
  channelMentionedMap.value = new Map()
  const conCache = restaurarEstadoSesion()
  await reconectarSesion(conCache)
}

async function cargarCanalesUnidos() {
  cargandoCanales.value = true
  try {
    const { data } = await chatApi.obtenerCanalesUnidos()
    canalesUnidos.value = data
  } catch (e: any) {
    console.error('[ChatWindow] Error cargando canales unidos:', e)
    if (e?.response?.status === 401 || e?.response?.status === 403) {
      await cerrarTodasSesiones()
    } else {
      canalesUnidos.value = []
    }
  } finally {
    cargandoCanales.value = false
  }
}

async function seleccionarCanal(canal: any) {
  conversacionActiva.value = null
  canalActivo.value = canal
  mensajeEnRespuesta.value = null
  modoEdicion.value = null
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

  // Cancelar suscripción anterior de presencia por canal
  if (channelPresenceSubscription) {
    websocketService.unsubscribe(channelPresenceSubscription)
    channelPresenceSubscription = null
  }

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

  // Suscribirse a la presencia por canal para actualizaciones en tiempo real
  if (websocketService.connected.value) {
    channelPresenceSubscription = websocketService.subscribeToChannelPresence(canal.id, (data: any) => {
      onlineMap.value.set(data.personajeId, data.online)
      onlineMap.value = new Map(onlineMap.value)
      if (data.status) {
        statusMap.value.set(data.personajeId, data.status)
        statusMap.value = new Map(statusMap.value)
      }
      cargarMiembrosOnline(true)
    })
  }
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

function handleSendCanal(texto: string) {
  if (modoEdicion.value) {
    ejecutarEdicion(texto)
  } else {
    enviarMensaje(texto)
  }
}

async function enviarMensaje(texto: string) {
  if (!texto || enviando.value || !canalActivo.value) return
  channelMentionedMap.value.set(canalActivo.value.id, false)
  channelMentionedMap.value = new Map(channelMentionedMap.value)
  enviando.value = true
  const mensajePadreId = mensajeEnRespuesta.value?.id ?? null
  const token = characterSessionStore.getToken()
  if (websocketService.connected.value && token) {
    websocketService.sendChannelMessage(canalActivo.value.id, texto, mensajePadreId)
    mensajeEnRespuesta.value = null
    enviando.value = false
  } else {
    try {
      await chatApi.enviarMensajeCanal(canalActivo.value.id, texto, mensajePadreId)
      mensajeEnRespuesta.value = null
      pagina.value = 0
      const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, 0, PAGE_SIZE)
      hayMasMensajes.value = !data.last
      mensajes.value = (data.content || []).reverse()
      usuarioScrolledUp.value = false
      scrollAlFinal()
    } catch {} finally { enviando.value = false }
  }
}

function iniciarRespuesta(msg: any) {
  mensajeEnRespuesta.value = msg
  modoEdicion.value = null
  nextTick(() => chatEditorRef.value?.enfocar())
}

function iniciarEdicion(msg: any) {
  modoEdicion.value = msg
  mensajeEnRespuesta.value = null
  nextTick(() => {
    chatEditorRef.value?.setContenido(msg.contenido)
    chatEditorRef.value?.enfocar()
  })
}

function copiarMensaje(msg: any) {
  copiarTexto(msg.contenido || '')
}

function cancelarEdicion() {
  modoEdicion.value = null
  chatEditorRef.value?.limpiar()
}

async function ejecutarEdicion(texto: string) {
  const msg = modoEdicion.value
  if (!texto || enviando.value || !canalActivo.value || !msg) return
  if (msg.contenido === texto) {
    modoEdicion.value = null
    chatEditorRef.value?.limpiar()
    return
  }
  enviando.value = true
  try {
    await chatApi.editarMensajeCanal(canalActivo.value.id, msg.id, texto)
    const idx = mensajes.value.findIndex((m: any) => m.id === msg.id)
    if (idx >= 0) {
      mensajes.value[idx] = { ...mensajes.value[idx], contenido: texto, editado: true }
    }
  } catch {}
  enviando.value = false
  modoEdicion.value = null
  chatEditorRef.value?.limpiar()
}

function scrollAMensaje(mensajeId: number) {
  const el = document.querySelector<HTMLElement>(`.msg-row[data-msg-id="${mensajeId}"]`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  mensajeDestacado.value = null
  nextTick(() => {
    mensajeDestacado.value = mensajeId
    setTimeout(() => {
      if (mensajeDestacado.value === mensajeId) mensajeDestacado.value = null
    }, 2000)
  })
}

async function eliminarMensaje(mensajeId: number) {
  if (modoEdicion.value?.id === mensajeId) {
    modoEdicion.value = null
    chatEditorRef.value?.limpiar()
  }
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
    mostrarMensajeModal('Error', e.response?.data?.error || 'Error al unirse')
  }
}

function abrirModalCrear() {
  nuevoCanalData.value = { nombre: '', descripcion: '', privado: false }
  quitarImagenCanal()
  errorCrear.value = ''
  mostrarListaCanales.value = false
  mostrarModalCrear.value = true
}

function cerrarModalCrear() {
  quitarImagenCanal()
  errorCrear.value = ''
  mostrarModalCrear.value = false
}

async function crearCanal() {
  if (!nuevoCanalData.value.nombre.trim()) { errorCrear.value = 'El nombre es obligatorio'; return }
  errorCrear.value = ''
  if (imagenCanal.value) {
    const errImg = await validarImagenCanal(imagenCanal.value)
    if (errImg) {
      errorCrear.value = errImg
      return
    }
  }
  let canalCreado: any = null
  try {
    const { data } = await chatApi.crearCanal(nuevoCanalData.value)
    canalCreado = data
    if (imagenCanal.value && data.id) {
      const imgRes = await chatApi.subirImagenCanal(data.id, imagenCanal.value)
      data.imagenUrl = imgRes.data?.imagenUrl ?? data.imagenUrl
    }
    mostrarModalCrear.value = false
    nuevoCanalData.value = { nombre: '', descripcion: '', privado: false }
    quitarImagenCanal()
    await cargarCanalesUnidos()
    suscribirCanales()
    seleccionarCanal(data)
  } catch (e: any) {
    if (canalCreado) {
      try { await chatApi.eliminarCanal(canalCreado.id) } catch {}
      errorCrear.value = `No se pudo crear el canal con la imagen seleccionada: ${extraerError(e, 'error desconocido')}`
    } else {
      errorCrear.value = extraerError(e, 'Error al crear el canal')
    }
  }
}

function abrirModalEditarCanal() {
  if (!canalActivo.value) return
  editarCanalData.value = {
    nombre: canalActivo.value.nombre,
    descripcion: canalActivo.value.descripcion || '',
    privado: canalActivo.value.privado,
  }
  imagenEdicionCanal.value = null
  quitarImagenEdicion.value = false
  imagenEdicionPreview.value = canalActivo.value.imagenUrl || null
  errorEditarCanal.value = ''
  mostrarEliminarCanal.value = false
  passwordEliminarCanal.value = ''
  errorEliminarCanal.value = ''
  mostrarModalEditarCanal.value = true
}

async function onImagenEdicionCanalChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  imagenEdicionCanal.value = file
  const error = await validarImagenCanal(file)
  if (error) {
    errorEditarCanal.value = error
    return
  }
  if (imagenEdicionPreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagenEdicionPreview.value)
  imagenEdicionPreview.value = URL.createObjectURL(file)
  quitarImagenEdicion.value = false
  errorEditarCanal.value = ''
}

function quitarImagenEdicionActual() {
  imagenEdicionCanal.value = null
  if (imagenEdicionPreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagenEdicionPreview.value)
  imagenEdicionPreview.value = null
  quitarImagenEdicion.value = true
  errorEditarCanal.value = ''
}

async function guardarEdicionCanal() {
  if (!canalActivo.value || !editarCanalData.value.nombre.trim()) {
    errorEditarCanal.value = 'El nombre es obligatorio'
    return
  }
  errorEditarCanal.value = ''
  if (imagenEdicionCanal.value) {
    const errImg = await validarImagenCanal(imagenEdicionCanal.value)
    if (errImg) {
      errorEditarCanal.value = errImg
      return
    }
  }
  try {
    let { data } = await chatApi.editarCanal(canalActivo.value.id, editarCanalData.value)
    if (imagenEdicionCanal.value) {
      const imgRes = await chatApi.subirImagenCanal(canalActivo.value.id, imagenEdicionCanal.value)
      data = imgRes.data
    } else if (quitarImagenEdicion.value && canalActivo.value.imagenUrl) {
      const imgRes = await chatApi.eliminarImagenCanal(canalActivo.value.id)
      data = imgRes.data
    }
    canalActivo.value = data
    mostrarModalEditarCanal.value = false
    await cargarCanalesUnidos()
  } catch (e: any) {
    errorEditarCanal.value = extraerError(e, 'Error al editar el canal')
  }
}

async function eliminarCanalConfirmado() {
  if (!canalActivo.value || eliminandoCanal.value) return
  if (!passwordEliminarCanal.value) {
    errorEliminarCanal.value = 'Introduce tu contraseña para eliminar el canal'
    return
  }
  errorEliminarCanal.value = ''
  eliminandoCanal.value = true
  const canalId = canalActivo.value.id
  try {
    await chatApi.eliminarCanal(canalId, passwordEliminarCanal.value)
    canalActivo.value = null
    mensajes.value = []
    miembros.value = []
    unreadCountMap.value.delete(canalId)
    unreadCountMap.value = new Map(unreadCountMap.value)
    mostrarModalEditarCanal.value = false
    await cargarCanalesUnidos()
    suscribirCanales()
  } catch (e: any) {
    errorEliminarCanal.value = extraerError(e, 'Error al eliminar el canal')
  } finally {
    eliminandoCanal.value = false
  }
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
  if (!canalActivo.value) return
  mostrarConfirmModal('Salir del canal', '¿Salir del canal?', async () => {
    const canalId = canalActivo.value!.id
    try {
      await chatApi.salirDeCanal(canalId)
      canalActivo.value = null
      mensajes.value = []
      miembros.value = []
      unreadCountMap.value.delete(canalId)
      unreadCountMap.value = new Map(unreadCountMap.value)
      await cargarCanalesUnidos()
      suscribirCanales()
    } catch (e: any) { errorMsg.value = e.response?.data?.mensaje || e.response?.data?.error || 'Error al salir del canal' }
  })
}

function verPerfil(personajeId: number) {
  perfilPersonajeId.value = personajeId
  mostrarPerfil.value = true
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
    miembrosOnline.value = sortByRole(members.filter((m: any) => m.online || localActiveIds.has(m.personajeId)))
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
  // Solo desconectamos el WebSocket (presencia). Las sesiones de personaje
  // se mantienen activas en el servidor para poder restaurarlas al volver.
  try { websocketService.disconnect() } catch {}
}

onMounted(async () => {
  solicitarPermisoNotificacion()
  await userStore.cargarDesdeToken()
  if (!userStore.usuario.value?.id) { router.push('/login'); return }

  try {
    await characterSessionStore.limpiarExpiradas()
    const activas = await characterSessionStore.obtenerSesionesActivas()
    if (activas.length > 0) {
      try {
        await conectarWebSocket()
        await cargarCanalesUnidos()
        suscribirCanales()
      } catch (e) {
        console.error('[ChatWindow] Error reconectando sesiones previas:', e)
        await cerrarTodasSesiones()
      }
    }
  } catch (e) {
    console.error('[ChatWindow] Error obteniendo sesiones activas:', e)
  }
  await cargarPersonajes()
  cargando.value = false
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('pagehide', handleBeforeUnload)

  pollingInterval = window.setInterval(() => {
    cargarMiembrosOnline(true)
  }, 5000)
})

onUnmounted(() => {
  persistentSubscriptions.forEach(s => websocketService.unsubscribe(s))
  wsSubscriptions.forEach(s => websocketService.unsubscribe(s))
  if (channelPresenceSubscription) {
    websocketService.unsubscribe(channelPresenceSubscription)
  }
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('pagehide', handleBeforeUnload)
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
          <div v-if="cargandoCanales" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary"></div>
          </div>
          <div v-else-if="canalesUnidos.length === 0" class="text-center text-muted p-3 small">
            No estás en ningún canal
          </div>
           <div v-for="canal in canalesUnidos" :key="canal.id"
                 class="channel-item d-flex align-items-center gap-3 px-3 py-2"
                 :class="{ active: canalActivo?.id === canal.id, 'channel-unread': (unreadCountMap.get(canal.id) ?? 0) > 0, 'channel-mentioned': channelMentionedMap.get(canal.id) ?? false }"
                 @click="seleccionarCanal(canal)">
             <div class="position-relative flex-shrink-0">
                <img :src="canalAvatar(canal)" class="rounded-circle" width="32" height="32" />
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
            <img :src="canalAvatar(canalActivo)" class="rounded-circle flex-shrink-0" width="28" height="28" />
            <div class="flex-grow-1 min-w-0">
              <h6 class="mb-0 text-truncate">{{ canalActivo.nombre }}</h6>
              <div class="d-flex align-items-center gap-2" style="font-size:0.7rem;">
                <ExpandableText :text="canalActivo.descripcion" :max-lines="1" class="flex-grow-1" />
                <span v-if="canalActivo.miembroCount != null" class="flex-shrink-0 miembros-link" @click="abrirListaMiembros" style="cursor:pointer;text-decoration:underline dotted;">
                  <i class="bi bi-people-fill me-1"></i>{{ canalActivo.miembroCount }} miembros
                </span>
              </div>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="mostrarConectados = !mostrarConectados" title="Conectados">
              <i class="bi bi-person-check"></i>
            </button>
            <button v-if="miRolEnCanal !== 'OWNER'" class="btn btn-sm btn-outline-warning" @click="denunciarCanalActivo" title="Denunciar canal">
              <i class="bi bi-flag"></i>
            </button>
            <button v-if="miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN'" class="btn btn-sm btn-outline-secondary" @click="abrirModalBaneados" title="Baneados del canal">
              <i class="bi bi-hammer"></i>
            </button>
            <button v-if="miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN'" class="btn btn-sm btn-outline-primary" @click="abrirModalEditarCanal" title="Editar canal">
              <i class="bi bi-pencil"></i>
            </button>
            <button v-if="miRolEnCanal !== 'OWNER'" class="btn btn-sm btn-outline-danger" @click="salirDelCanal" title="Salir del canal">
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
              <ChatMessage v-for="msg in mensajes" :key="msg.id"
                :msg="msg"
                :es-mio="msg.esMio"
                :show-header="true"
                :can-delete="!msg.eliminado && (msg.esMio || esAdminOrOwner())"
                :can-editar="msg.esMio && !msg.eliminado"
                :can-denunciar="!msg.esMio && !msg.eliminado"
                :mostrar-acciones="true"
                :destacar="msg.id === mensajeDestacado"
                @delete="eliminarMensaje"
                @ver-perfil="verPerfil"
                @responder="iniciarRespuesta"
                @copiar="copiarMensaje"
                @editar="iniciarEdicion"
                @denunciar="denunciarMensaje"
                @scroll-a-mensaje="scrollAMensaje"
              />
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

          <!-- Input canal -->
          <ChatEditor
            ref="chatEditorRef"
            :miembros-online="miembrosOnline"
            :sending="enviando"
            :mensaje-en-respuesta="mensajeEnRespuesta"
            :modo-edicion="modoEdicion"
            @send="handleSendCanal"
            @cancelar-respuesta="mensajeEnRespuesta = null"
            @cancelar-edicion="cancelarEdicion"
          />
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
              <ChatMessage v-for="msg in mensajesPrivados" :key="msg.id"
                :msg="msg"
                :es-mio="msg.esMio"
                :avatar-src="msg.esMio ? avatarUrl(characterSessionStore.sesionActual.value?.personajeAvatar) : avatarUrl(conversacionActiva.personajeAvatar)"
                @ver-perfil="verPerfil"
              />
            </template>
            <div v-else class="text-center text-muted py-5">
              <i class="bi bi-chat-dots fs-1 d-block mb-2 opacity-50"></i>
              <p class="small">No hay mensajes aún. Envía un mensaje para iniciar la conversación.</p>
            </div>
          </div>

          <!-- PM Input -->
          <ChatEditor
            :miembros-online="miembrosOnline"
            :sending="enviando"
            @send="handleSendPm"
          />
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
            <i v-if="m.rol === 'OWNER'" class="bi bi-key-fill text-warning" title="Dueño del canal"></i>
            <i v-else-if="m.rol === 'MOD'" class="bi bi-shield-fill-check text-success" title="Moderador"></i>
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
          <img :src="canalAvatar(c)" class="rounded-circle" width="36" height="36" />
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
          <img :src="canalAvatar(c)" class="rounded-circle" width="36" height="36" />
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between">
              <small class="fw-medium d-block">{{ c.nombre }}</small>
              <span v-if="c.miRol" class="badge bg-secondary" style="font-size:0.6rem;">{{ c.miRol }}</span>
            </div>
            <small class="text-muted">{{ c.descripcion || 'Sin descripción' }} · {{ c.miembroCount }} miembros</small>
          </div>
        </div>
        <hr class="my-2" />
        <button class="btn btn-primary btn-sm w-100" @click="abrirModalCrear">
          <i class="bi bi-plus-lg me-1"></i> Crear nuevo canal
        </button>
      </template>
    </div>
  </div>

  <!-- Modal: Crear canal -->
  <div v-if="mostrarModalCrear" class="modal-backdrop-custom" @click.self="cerrarModalCrear">
    <div class="modal-content-custom shadow rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Crear nuevo canal</h5>
        <button class="btn-close" @click="cerrarModalCrear"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Nombre del canal</label>
        <input v-model="nuevoCanalData.nombre" type="text" class="form-control form-control-sm" maxlength="100" />
      </div>
      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <textarea v-model="nuevoCanalData.descripcion" class="form-control form-control-sm" rows="2" maxlength="500"></textarea>
      </div>
      <div class="mb-3">
        <label class="form-label">Imagen del canal (opcional)</label>
        <div class="d-flex align-items-center gap-3">
          <img v-if="imagenPreview" :src="imagenPreview" class="rounded-circle" width="48" height="48" style="object-fit:cover;" />
          <div v-else class="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold" style="width:48px;height:48px;font-size:0.9rem;">
            {{ nuevoCanalData.nombre ? nuevoCanalData.nombre.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : '?' }}
          </div>
          <div class="flex-grow-1">
            <input type="file" ref="inputImagenRef" class="d-none" accept="image/jpeg,image/png,image/webp" @change="onImagenCanalChange" />
            <button type="button" class="btn btn-outline-secondary btn-sm me-2" @click="inputImagenRef?.click()">
              <i class="bi bi-image me-1"></i> Seleccionar
            </button>
            <button v-if="imagenPreview || imagenCanal" type="button" class="btn btn-outline-danger btn-sm" @click="quitarImagenCanal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="mb-3 form-check">
        <input v-model="nuevoCanalData.privado" type="checkbox" class="form-check-input" id="chkPrivado" />
        <label class="form-check-label small" for="chkPrivado">Canal privado (solo por invitación)</label>
      </div>
      <div v-if="errorCrear" class="alert alert-danger py-1 small">{{ errorCrear }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="cerrarModalCrear">Cancelar</button>
        <button class="btn btn-primary btn-sm" @click="crearCanal"><i class="bi bi-check-lg me-1"></i> Crear</button>
      </div>
    </div>
  </div>

  <!-- Modal editar canal -->
  <div v-if="mostrarModalEditarCanal" class="modal-backdrop-custom" @click.self="mostrarModalEditarCanal = false">
    <div class="modal-content-custom shadow rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Editar canal</h5>
        <button class="btn-close" @click="mostrarModalEditarCanal = false"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Nombre del canal</label>
        <input v-model="editarCanalData.nombre" type="text" class="form-control form-control-sm" maxlength="100" />
      </div>
      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <textarea v-model="editarCanalData.descripcion" class="form-control form-control-sm" rows="2" maxlength="500"></textarea>
      </div>
      <div class="mb-3">
        <label class="form-label">Imagen del canal</label>
        <div class="d-flex align-items-center gap-3">
          <img v-if="imagenEdicionSrc" :src="imagenEdicionSrc" class="rounded-circle flex-shrink-0" width="48" height="48" style="object-fit:cover;" />
          <div v-else class="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold" style="width:48px;height:48px;font-size:0.9rem;">
            {{ editarCanalData.nombre ? editarCanalData.nombre.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : '?' }}
          </div>
          <div class="flex-grow-1">
            <input type="file" ref="inputImagenEdicionRef" class="d-none" accept="image/jpeg,image/png,image/webp" @change="onImagenEdicionCanalChange" />
            <button type="button" class="btn btn-outline-secondary btn-sm me-2" @click="inputImagenEdicionRef?.click()">
              <i class="bi bi-image me-1"></i> Seleccionar
            </button>
            <button v-if="imagenEdicionPreview || imagenEdicionCanal" type="button" class="btn btn-outline-danger btn-sm" @click="quitarImagenEdicionActual">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="mb-3 form-check">
        <input v-model="editarCanalData.privado" type="checkbox" class="form-check-input" id="chkPrivadoEditar" />
        <label class="form-check-label small" for="chkPrivadoEditar">Canal privado (solo por invitación)</label>
      </div>
      <div v-if="errorEditarCanal" class="alert alert-danger py-1 small">{{ errorEditarCanal }}</div>

      <div v-if="miRolEnCanal === 'OWNER'" class="border-top pt-3 mt-3">
        <div class="d-flex justify-content-between align-items-center">
          <span class="small text-danger fw-bold"><i class="bi bi-exclamation-triangle me-1"></i>Zona de peligro</span>
          <button v-if="!mostrarEliminarCanal" class="btn btn-outline-danger btn-sm" @click="mostrarEliminarCanal = true">
            <i class="bi bi-trash me-1"></i> Eliminar canal
          </button>
          <button v-else class="btn btn-outline-secondary btn-sm" @click="mostrarEliminarCanal = false">
            <i class="bi bi-x-lg me-1"></i> Cancelar
          </button>
        </div>
        <div v-if="mostrarEliminarCanal" class="mt-3">
          <p class="small text-muted mb-2">
            Al eliminar el canal, todos los personajes miembros saldrán y se borrarán todos los mensajes. Esta acción no se puede deshacer.
          </p>
          <label class="form-label small" for="passwordEliminarCanal">Escribe tu contraseña para confirmar</label>
          <input v-model="passwordEliminarCanal" id="passwordEliminarCanal" type="password" class="form-control form-control-sm mb-2" placeholder="Contraseña" @keyup.enter="eliminarCanalConfirmado" />
          <div v-if="errorEliminarCanal" class="alert alert-danger py-1 small">{{ errorEliminarCanal }}</div>
          <button class="btn btn-danger btn-sm" :disabled="eliminandoCanal" @click="eliminarCanalConfirmado">
            <i class="bi bi-trash me-1"></i> {{ eliminandoCanal ? 'Eliminando...' : 'Eliminar definitivamente' }}
          </button>
        </div>
      </div>

      <div class="d-flex justify-content-end gap-2 mt-3">
        <button class="btn btn-outline-secondary btn-sm" @click="mostrarModalEditarCanal = false">Cancelar</button>
        <button class="btn btn-primary btn-sm" @click="guardarEdicionCanal"><i class="bi bi-check-lg me-1"></i> Guardar</button>
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
    <div v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN') && contextMenuTarget.rol === 'MOD'" class="context-menu-divider"></div>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN') && contextMenuTarget.rol === 'MOD'"
            class="context-menu-item" @click="descenderAMember(contextMenuTarget)">
      <i class="bi bi-arrow-down-circle me-2"></i> Descender a miembro
    </button>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN' || miRolEnCanal === 'MOD')
                  && contextMenuTarget.personajeId !== characterSessionStore.sesionActual.value?.personajeId
                  && contextMenuTarget.rol !== 'OWNER' && contextMenuTarget.rol !== 'ADMIN'"
            class="context-menu-item text-danger" @click="expulsarDelCanal(contextMenuTarget)">
      <i class="bi bi-door-open me-2"></i> Expulsar del canal
    </button>
    <div v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN')
              && contextMenuTarget.personajeId !== characterSessionStore.sesionActual.value?.personajeId
              && contextMenuTarget.rol !== 'OWNER' && contextMenuTarget.rol !== 'ADMIN'" class="context-menu-divider"></div>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN')
                  && contextMenuTarget.personajeId !== characterSessionStore.sesionActual.value?.personajeId
                  && contextMenuTarget.rol !== 'OWNER' && contextMenuTarget.rol !== 'ADMIN'"
            class="context-menu-item text-danger" @click="abrirBanModal(contextMenuTarget)">
      <i class="bi bi-hammer me-2"></i> Banear del canal
    </button>
  </div>

  <!-- Modal: Banear personaje -->
  <div v-if="banTarget" class="modal-backdrop-custom" @click.self="banTarget = null">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:400px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-hammer text-danger me-2"></i>Banear a {{ banTarget.personajeNombre }}</h5>
        <button class="btn-close" @click="banTarget = null"></button>
      </div>
      <p class="text-muted small mb-3">Selecciona la duración del baneo:</p>
      <div class="d-flex flex-column gap-2 mb-4">
        <label v-for="op in opcionesBan" :key="op.value"
               class="d-flex align-items-center gap-2 p-2 border rounded cursor-pointer"
               :class="banDuracion === op.value ? 'border-primary bg-primary bg-opacity-10' : ''">
          <input type="radio" :value="op.value" v-model="banDuracion" class="form-check-input m-0" />
          <span>{{ op.label }}</span>
        </label>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="banTarget = null">Cancelar</button>
        <button class="btn btn-danger btn-sm" @click="confirmarBan">
          <i class="bi bi-hammer me-1"></i> Banear
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Denunciar mensaje o canal -->
  <div v-if="denunciaTarget" class="modal-backdrop-custom" @click.self="denunciaTarget = null">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:440px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">
          <i class="bi bi-flag text-warning me-2"></i>
          {{ denunciaTarget.tipo === 'CANAL' ? 'Denunciar canal' : 'Denunciar mensaje' }}
        </h5>
        <button class="btn-close" @click="denunciaTarget = null"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Motivo <span class="text-danger">*</span></label>
        <input v-model="denunciaMotivo" type="text" class="form-control" maxlength="200" :placeholder="denunciaTarget.tipo === 'CANAL' ? '¿Por qué denuncias este canal?' : '¿Por qué denuncias este mensaje?'" />
      </div>
      <div class="mb-4">
        <label class="form-label">Detalle (opcional)</label>
        <textarea v-model="denunciaDetalle" class="form-control" rows="4" maxlength="2000" placeholder="Amplía la información si lo necesitas..."></textarea>
        <div class="text-end text-muted small mt-1">{{ denunciaDetalle.length }}/2000</div>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="denunciaTarget = null">Cancelar</button>
        <button
          class="btn btn-warning btn-sm"
          :disabled="enviandoDenuncia || !denunciaMotivo.trim()"
          @click="enviarDenunciaMensaje"
        >
          <span v-if="enviandoDenuncia" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-flag me-1"></i>
          Enviar denuncia
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Baneados del canal -->
  <div v-if="mostrarBaneados" class="modal-backdrop-custom" @click.self="mostrarBaneados = false">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:480px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-hammer text-danger me-2"></i>Baneados del canal</h5>
        <button class="btn-close" @click="mostrarBaneados = false"></button>
      </div>
      <div v-if="cargandoBaneados" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary"></div>
      </div>
      <div v-else-if="baneados.length === 0" class="text-muted small text-center py-3">
        No hay personajes baneados.
      </div>
      <div v-else class="d-flex flex-column gap-2">
        <div v-for="b in baneados" :key="b.personajeId" class="d-flex align-items-center gap-2 p-2 border rounded">
          <img :src="avatarUrl(b.avatar)" class="rounded-circle" width="32" height="32" style="object-fit:cover;" />
          <div class="flex-grow-1">
            <div class="small fw-medium">{{ b.personajeNombre }}</div>
            <div class="text-muted" style="font-size:0.72rem;">
              <template v-if="b.activo">
                {{ b.fechaExpiracion ? 'Hasta ' + new Date(b.fechaExpiracion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Permanente' }}
              </template>
              <template v-else>Expirado</template>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-success" @click="desbanearPersonaje(b)">
            <i class="bi bi-unlock me-1"></i> Desbanear
          </button>
        </div>
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

  <!-- Modal: Mensaje de error/info -->
  <div v-if="mensajeModal" class="modal-backdrop-custom" @click.self="mensajeModal = null">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:420px;">
      <h5 class="mb-3">{{ mensajeModal.titulo }}</h5>
      <p class="mb-4">{{ mensajeModal.texto }}</p>
      <div class="d-flex justify-content-end">
        <button class="btn btn-primary btn-sm" @click="mensajeModal = null">Aceptar</button>
      </div>
    </div>
  </div>

  <!-- Modal: Confirmación genérica -->
  <div v-if="confirmModal" class="modal-backdrop-custom" @click.self="confirmModal = null">
    <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:420px;">
      <h5 class="mb-3">{{ confirmModal.titulo }}</h5>
      <p class="mb-4">{{ confirmModal.texto }}</p>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="confirmModal = null">Cancelar</button>
        <button class="btn btn-primary btn-sm" @click="confirmModal.onConfirm(); confirmModal = null">Aceptar</button>
      </div>
    </div>
  </div>

  <!-- Modal: Aviso -->
  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
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

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

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

.chat-header { min-height: 52px; }

.chat-mensajes { background: #fff; }
.chat-mensajes .msg-row { scroll-margin-block: 80px; }
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

.miembros-link:hover {
  text-decoration: underline !important;
}

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
</style>

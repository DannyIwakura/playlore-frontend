<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { userStore } from '../../store/userStore'
import { characterSessionStore } from '../../store/characterSessionStore'
import { websocketService } from '../../services/websocket'
import { chatApi } from '../../services/chatApi'
import api from '../../services/api'
import PerfilPersonajeView from '../Personajes/PerfilPersonajeView.vue'
import { statusOptions, getStatusColor, avatarUrl, canalAvatar, solicitarPermisoNotificacion, notificarPush, truncarTexto, formatFecha } from './chatUtils'
import ChatEditor from './ChatEditor.vue'
import ChatMessage from './ChatMessage.vue'
import ExpandableText from '../../components/ExpandableText.vue'
import ModalAviso from '../../components/ModalAviso.vue'
import ModalConfirmacion from '../../components/ModalConfirmacion.vue'
import ModalFormulario from '../../components/ModalFormulario.vue'
import { useChatPresencia } from './composables/useChatPresencia'
import { useChatMensajes } from './composables/useChatMensajes'
import { useChatBusqueda } from './composables/useChatBusqueda'
import { useChatPrivado } from './composables/useChatPrivado'
import { useChatModeracion } from './composables/useChatModeracion'
import { useChatDenuncias } from './composables/useChatDenuncias'

const router = useRouter()

const personajes = ref<any[]>([])
const cargandoPersonajes = ref(true)
const canalesUnidos = ref<any[]>([])
const cargandoCanales = ref(true)
const canalActivo = ref<any>(null)
const conversacionActiva = ref<any>(null)
const miembros = ref<any[]>([])

// ---- Layout responsive ----
// Se escucha matchMedia en lugar de leer window.innerWidth en cada render: asi
// la vista reacciona al girar el movil o al redimensionar la ventana, y el
// sidebar y el panel de conectados arrancan cerrados donde no caben.
const consultaMovil = window.matchMedia('(max-width: 767.98px)')
const consultaCompacta = window.matchMedia('(max-width: 991.98px)')

const esMovil = ref(consultaMovil.matches)
const esCompacto = ref(consultaCompacta.matches)
const sidebarVisible = ref(!consultaMovil.matches)
const mostrarConectados = ref(!consultaCompacta.matches)
const sidebarRef = ref<HTMLElement | null>(null)
const botonCanalesRef = ref<HTMLButtonElement | null>(null)
const botonConectadosRef = ref<HTMLButtonElement | null>(null)
const mostrarAccionesCanal = ref(false)

function abrirSidebar() {
  sidebarVisible.value = true
  nextTick(() => {
    const destino = sidebarRef.value?.querySelector<HTMLElement>('.channel-item, .sidebar-profile button')
    destino?.focus()
  })
}

function cerrarSidebar(devolverFoco = false) {
  if (!sidebarVisible.value) return
  sidebarVisible.value = false
  if (devolverFoco) nextTick(() => botonCanalesRef.value?.focus())
}

function alternarSidebar() {
  if (sidebarVisible.value) cerrarSidebar()
  else abrirSidebar()
}

// ---- Estado de la conexion ----
// El cliente STOMP reintenta solo cada 5 s. Exponemos su estado para avisar de
// que los mensajes nuevos pueden no estar llegando mientras se reconecta.
const wsConectado = websocketService.connected
const conexionSolicitada = ref(false)
const reconectando = ref(false)

watch(wsConectado, (conectado) => {
  if (conectado) reconectando.value = false
  else if (conexionSolicitada.value) reconectando.value = true
})

function alCambiarLayout() {
  esMovil.value = consultaMovil.matches
  esCompacto.value = consultaCompacta.matches
  if (!consultaMovil.matches) sidebarVisible.value = true
  if (!consultaCompacta.matches) mostrarConectados.value = true
  // Al bajar de 992 el panel pasa a ser un cajon: se cierra para no tapar el chat.
  else if (canalActivo.value) mostrarConectados.value = false
}

function alPulsarEscape(evento: KeyboardEvent) {
  if (evento.key !== 'Escape' || cualquierModalAbierto.value) return
  if (esMovil.value && sidebarVisible.value) {
    evento.stopPropagation()
    cerrarSidebar(true)
    return
  }
  if (esCompacto.value && mostrarConectados.value) {
    evento.stopPropagation()
    cerrarConectados()
  }
}

function etiquetaEstado(personajeId: number): string {
  const estado = statusMap.value.get(personajeId)
  if (estado) return statusOptions.find(s => s.value === estado)?.label ?? 'Conectado'
  return onlineMap.value.get(personajeId) ? 'Conectado' : 'Desconectado'
}

function moverFocoEnMenu(evento: KeyboardEvent, selector: string, cerrar: () => void) {
  const menu = evento.currentTarget as HTMLElement
  const items = Array.from(menu.querySelectorAll<HTMLElement>(selector))
  if (evento.key === 'Escape') {
    evento.stopPropagation()
    cerrar()
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(evento.key) || items.length === 0) return
  evento.preventDefault()
  const indice = items.indexOf(document.activeElement as HTMLElement)
  const siguiente = evento.key === 'Home' ? 0
    : evento.key === 'End' ? items.length - 1
    : (indice + (evento.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
  items[siguiente]?.focus()
}

function alNavegarMenuEstado(evento: KeyboardEvent) {
  moverFocoEnMenu(evento, '[role="menuitemradio"]', () => {
    mostrarSelectorEstado.value = false
    nextTick(() => document.querySelector<HTMLElement>('.dropdown-estado')?.focus())
  })
}

function alNavegarMenuAcciones(evento: KeyboardEvent) {
  moverFocoEnMenu(evento, '[role="menuitem"]', () => {
    mostrarAccionesCanal.value = false
    nextTick(() => document.querySelector<HTMLElement>('[aria-controls="chat-acciones-canal"]')?.focus())
  })
}

function cerrarAccionesFuera(evento: MouseEvent) {
  if (!mostrarAccionesCanal.value) return
  const objetivo = evento.target as HTMLElement | null
  if (!objetivo?.closest('.chat-header__acciones')) mostrarAccionesCanal.value = false
}

function cerrarConectados() {
  mostrarConectados.value = false
  nextTick(() => botonConectadosRef.value?.focus())
}

function cerrarEstadoFuera(evento: MouseEvent) {
  if (!mostrarSelectorEstado.value) return
  const objetivo = evento.target as HTMLElement | null
  if (!objetivo?.closest('.sidebar-profile')) mostrarSelectorEstado.value = false
}

const PAGE_SIZE = 15

const unreadCountMap = ref<Map<number, number>>(new Map())
const channelMentionedMap = ref<Map<number, boolean>>(new Map())
const channelLastSeenIds = ref<Record<number, number>>({})

const chatEditorRef = ref<InstanceType<typeof ChatEditor> | null>(null)
const buscadorInputRef = ref<HTMLInputElement | null>(null)

function abrirBuscador() {
  if (!canalActivo.value) return
  busquedaAbierta.value = true
  nextTick(() => buscadorInputRef.value?.focus())
}

function cerrarBuscador() {
  cerrarBusqueda()
  mensajeDestacado.value = null
}

const mostrarPerfil = ref(false)
const perfilPersonajeId = ref<number | null>(null)

const conversacionAEliminar = ref<any>(null)

function pedirEliminarConversacion(conv: any) {
  conversacionAEliminar.value = conv
}

function confirmarEliminarConversacion() {
  const conv = conversacionAEliminar.value
  conversacionAEliminar.value = null
  if (conv) eliminarConversacionDeLista(conv)
}

function verPerfil(personajeId: number) {
  perfilPersonajeId.value = personajeId
  mostrarPerfil.value = true
}

// El perfil a pantalla completa no usa ModalFormulario (no es un formulario y
// ocupa toda la ventana), asi que replicamos su contrato: foco al abrir,
// Escape para cerrar, Tab atrapado y foco devuelto al elemento de origen.
const perfilModalRef = ref<HTMLElement | null>(null)
let perfilFocoPrevio: HTMLElement | null = null

function cerrarPerfil() {
  mostrarPerfil.value = false
  nextTick(() => perfilFocoPrevio?.focus())
}

watch(mostrarPerfil, async (abierto) => {
  if (!abierto) return
  perfilFocoPrevio = document.activeElement as HTMLElement | null
  await nextTick()
  perfilModalRef.value?.focus()
})

function alNavegarPerfil(evento: KeyboardEvent) {
  if (evento.key === 'Escape') {
    evento.stopPropagation()
    evento.preventDefault()
    cerrarPerfil()
    return
  }
  if (evento.key !== 'Tab') return
  const cont = perfilModalRef.value
  if (!cont) return
  const items = Array.from(cont.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ))
  if (items.length === 0) return
  const primero = items[0]
  const ultimo = items[items.length - 1]
  const activo = document.activeElement
  if (evento.shiftKey && (!cont.contains(activo) || activo === primero)) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && activo === ultimo) {
    evento.preventDefault()
    primero.focus()
  }
}

// Context menu (conectados)
const contextMenuTarget = ref<any>(null)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTrigger = ref<HTMLElement | null>(null)
const contextMenuRef = ref<HTMLElement | null>(null)

function posicionarContextMenu(x: number, y: number) {
  const menuW = 220
  const menuH = 240
  const margen = 8
  contextMenuX.value = Math.max(margen, Math.min(x, window.innerWidth - menuW - margen))
  contextMenuY.value = Math.max(margen, Math.min(y, window.innerHeight - menuH - margen))
}

function enfocarPrimerItemMenu() {
  nextTick(() => contextMenuRef.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus())
}

function abrirContextMenu(e: MouseEvent, m: any) {
  e.preventDefault()
  contextMenuTrigger.value = null
  contextMenuTarget.value = m
  posicionarContextMenu(e.clientX, e.clientY)
  enfocarPrimerItemMenu()
}

// Abre el mismo menu desde el boton de acciones de una fila: se ancla al boton
// y recuerda el disparador para devolverle el foco al cerrar con Escape.
function abrirContextMenuDesde(boton: HTMLElement, m: any) {
  contextMenuTrigger.value = boton
  contextMenuTarget.value = m
  const r = boton.getBoundingClientRect()
  posicionarContextMenu(r.right - 220, r.bottom + 4)
  enfocarPrimerItemMenu()
}

function cerrarContextMenu(devolverFoco = false) {
  const disparador = contextMenuTrigger.value
  contextMenuTarget.value = null
  contextMenuTrigger.value = null
  if (devolverFoco) nextTick(() => disparador?.focus())
}

function alNavegarMenuContexto(evento: KeyboardEvent) {
  moverFocoEnMenu(evento, '[role="menuitem"]', () => cerrarContextMenu(true))
}

// Modales globales
const aviso = ref<string | null>(null)
const mensajeModal = ref<{ titulo: string; texto: string } | null>(null)
function mostrarMensajeModal(titulo: string, texto: string) { mensajeModal.value = { titulo, texto } }
const confirmModal = ref<{ titulo: string; texto: string; onConfirm: () => void } | null>(null)
function mostrarConfirmModal(titulo: string, texto: string, onConfirm: () => void) { confirmModal.value = { titulo, texto, onConfirm } }
const mostrarConfirmacionDesconectar = ref(false)
const personajeDesconectarIdx = ref(-1)
const mostrarSelectorPersonajes = ref(false)

// ---- Composables ----
const {
  onlineMap, statusMap, miembrosOnline, cargandoMiembrosOnline, mostrarSelectorEstado,
  estadoActual, statusColor, getTabStatusColor, cambiarEstado, cargarMiembrosOnline,
} = useChatPresencia({ canalActivo })

watch(mostrarSelectorEstado, (abierto) => {
  if (!abierto) return
  nextTick(() => {
    const activo = document.querySelector<HTMLElement>('#chat-estado-menu [aria-checked="true"]')
    ;(activo ?? document.querySelector<HTMLElement>('#chat-estado-menu [role="menuitemradio"]'))?.focus()
  })
})

watch(mostrarAccionesCanal, (abierto) => {
  if (!abierto) return
  nextTick(() => {
    document.querySelector<HTMLElement>('#chat-acciones-canal [role="menuitem"]')?.focus()
  })
})

const {
  mensajes, cargando, enviando, cargandoMas, hayMasMensajes, usuarioScrolledUp, errorMsg, pagina,
  mensajeEnRespuesta, modoEdicion, mensajeDestacado, mensajesContainer, mostrarConfirmacionEliminar,
  mensajeAEliminarId, scrollAlFinal, scrollAlFinalForzado, handleScroll, handleMentionClick,
  handleSendCanal, iniciarRespuesta, iniciarEdicion, copiarMensaje, cancelarEdicion, ejecutarEdicion,
  scrollAMensaje, eliminarMensaje, ejecutarEliminarMensaje, esAdminOrOwner, refrescarMensajesActivos,
} = useChatMensajes({ canalActivo, PAGE_SIZE, channelLastSeenIds, channelMentionedMap, chatEditorRef, verPerfil })

const {
  conversacionesPrivadas, mensajesPrivados, noLeidosPriv, noLeidosCharacter, cargandoPriv,
  reproducirSonidoPM, cargarConversaciones,
  abrirConversacionPrivada, seleccionarConversacion, cerrarConversacion, enviarMensajePrivadoWs,
  handleSendPm, eliminarConversacionDeLista,
} = useChatPrivado({ canalActivo, conversacionActiva, scrollAlFinal, cerrarContextMenu })

const {
  miRolEnCanal, puedeSilenciarContextMenu, banTarget, banDuracion, opcionesBan, silenciarTarget,
  silenciarDuracion, opcionesSilenciar, mostrarBaneados, baneados, cargandoBaneados, ascenderAMod,
  descenderAMember, expulsarDelCanal, estaSilenciado, abrirBanModal, confirmarBan, abrirSilenciarModal,
  confirmarSilenciar, desilenciar, abrirModalBaneados, desbanearPersonaje,
} = useChatModeracion({ canalActivo, contextMenuTarget, cargarMiembrosOnline, cerrarContextMenu, mostrarConfirmModal, aviso })

const {
  denunciaTarget, denunciaMotivo, denunciaDetalle, enviandoDenuncia, denunciarMensaje,
  denunciarCanalActivo, enviarDenunciaMensaje,
} = useChatDenuncias({ canalActivo, cerrarContextMenu, aviso })

const {
  busquedaAbierta, terminoBusqueda, buscando, cargandoMas: cargandoMasResultados, resultados, hayMasResultados, errorBusqueda,
  buscar, cargarMasResultados, cerrarBusqueda, irAResultado: cerrarPanelBusqueda,
} = useChatBusqueda({ canalActivo })

function abrirConversacion(conv: any) {
  seleccionarConversacion(conv)
  if (esMovil.value) cerrarSidebar()
}

async function saltarAResultado(resultado: any) {
  cerrarPanelBusqueda(resultado)
  if (!canalActivo.value || resultado?.id == null) return
  const yaCargado = mensajes.value.some((m: any) => m.id === resultado.id)
  if (yaCargado) {
    scrollAMensaje(resultado.id)
    return
  }
  try {
    const { data } = await chatApi.paginaDeMensaje(canalActivo.value.id, resultado.id, PAGE_SIZE)
    const paginaObjetivo = data.pagina ?? 0
    const res = await chatApi.obtenerMensajesCanal(canalActivo.value.id, paginaObjetivo, PAGE_SIZE)
    const content: any[] = res.data.content || []
    pagina.value = paginaObjetivo
    hayMasMensajes.value = !res.data.last
    usuarioScrolledUp.value = false
    mensajes.value = content.reverse()
    await nextTick()
    scrollAMensaje(resultado.id)
    if (!mensajes.value.some((m: any) => m.id === resultado.id)) {
      aviso.value = 'No se pudo localizar el mensaje en el historial'
    }
  } catch {
    aviso.value = 'No se pudo saltar al mensaje'
  }
}

// Lista de miembros (modal)
const mostrarListaMiembros = ref(false)
const miembrosLista = ref<any[]>([])
const paginaMiembros = ref(0)
const cargandoMiembros = ref(false)
const hayMasMiembros = ref(true)

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

// Lista de canales (modal)
const mostrarListaCanales = ref(false)
const pestanaLista = ref<'oficiales' | 'usuarios'>('oficiales')
const canalesOficiales = ref<any[]>([])
const canalesUsuarios = ref<any[]>([])
const cargandoLista = ref(false)

// Crear canal
const mostrarModalCrear = ref(false)
const nuevoCanalData = ref({ nombre: '', descripcion: '', privado: false })
const errorCrear = ref('')
const imagenCanal = ref<File | null>(null)
const imagenPreview = ref<string | null>(null)
const inputImagenRef = ref<HTMLInputElement | null>(null)

// Editar canal
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
const botonEliminarCanalRef = ref<HTMLButtonElement | null>(null)
const passwordEliminarCanalRef = ref<HTMLInputElement | null>(null)

const imagenEdicionSrc = computed(() => {
  const p = imagenEdicionPreview.value
  if (!p) return ''
  if (p.startsWith('blob:') || p.startsWith('data:') || p.startsWith('http')) return p
  return canalAvatar({ nombre: editarCanalData.value.nombre, imagenUrl: p })
})

const cualquierModalAbierto = computed(() =>
  mostrarListaMiembros.value || mostrarSelectorPersonajes.value || mostrarListaCanales.value ||
  mostrarModalCrear.value || mostrarModalEditarCanal.value || mostrarPerfil.value ||
  mostrarConfirmacionDesconectar.value || !!mensajeModal.value || !!confirmModal.value ||
  mostrarConfirmacionEliminar.value || !!banTarget.value || !!denunciaTarget.value || !!silenciarTarget.value ||
  mostrarBaneados.value || !!conversacionAEliminar.value
)
watch(cualquierModalAbierto, (abierto) => {
  if (abierto) window.dispatchEvent(new CustomEvent('pl:modal-abierto'))
})

let wsSubscriptions: string[] = []
let persistentSubscriptions: string[] = []
let channelPresenceSubscription: string | null = null
let pollingInterval: number | null = null

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

/**
 * Quita un canal de las listas visibles y, si estaba abierto, lo cierra y
 * cancela sus suscripciones. Lo usan la expulsion, el baneo, la eliminacion y
 * la suspension global del canal.
 */
function quitarCanalDeListas(canalId: number) {
  canalesUnidos.value = canalesUnidos.value.filter((c: any) => c.id !== canalId)
  canalesOficiales.value = canalesOficiales.value.filter((c: any) => c.id !== canalId)
  canalesUsuarios.value = canalesUsuarios.value.filter((c: any) => c.id !== canalId)
  if (canalActivo.value?.id === canalId) {
    canalActivo.value = null
    mensajes.value = []
    miembros.value = []
    if (channelPresenceSubscription) {
      websocketService.unsubscribe(channelPresenceSubscription)
      channelPresenceSubscription = null
    }
  }
  unreadCountMap.value.delete(canalId)
  unreadCountMap.value = new Map(unreadCountMap.value)
  websocketService.unsubscribe(`channel-${canalId}`)
  websocketService.unsubscribe(`channel-presence-${canalId}`)
}

async function conectarWebSocket() {
  const token = characterSessionStore.getToken()
  if (!token) return
  conexionSolicitada.value = true
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
      if (data.tipo === 'SILENCIADO' || data.tipo === 'DESILENCIADO') {
        if (canalActivo.value?.id === data.canalId) cargarMiembrosOnline()
        if (data.tipo === 'SILENCIADO' && data.silenciadoHasta) {
          mostrarMensajeModal(
            'Has sido silenciado',
            `Has sido silenciado en ${data.canalNombre || 'el canal'} hasta ${new Date(data.silenciadoHasta).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}.`
          )
        } else if (data.tipo === 'DESILENCIADO') {
          mostrarMensajeModal('Silencio terminado', `Ya puedes volver a escribir en ${data.canalNombre || 'el canal'}.`)
        }
        return
      }
      if (data.tipo === 'CANAL_SUSPENDIDO') {
        quitarCanalDeListas(data.canalId)
        const hasta = data.hasta
          ? ` hasta ${new Date(data.hasta).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`
          : ' de forma indefinida'
        mostrarMensajeModal(
          'Canal suspendido',
          `El canal ${data.canalNombre || `#${data.canalId}`} ha sido suspendido por moderación${hasta}.` +
            (data.motivo ? ` Motivo: ${data.motivo}` : '')
        )
        return
      }
      if (data.tipo === 'CANAL_RESTAURADO') {
        void cargarCanalesUnidos()
        if (mostrarListaCanales.value) void cargarListaCanales()
        return
      }
      if (data.tipo === 'EXPULSADO' || data.tipo === 'BANEADO' || data.tipo === 'CANAL_ELIMINADO') {
        quitarCanalDeListas(data.canalId)
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
  cerrarBusqueda()
  unreadCountMap.value.set(canal.id, 0)
  unreadCountMap.value = new Map(unreadCountMap.value)
  channelMentionedMap.value.set(canal.id, false)
  channelMentionedMap.value = new Map(channelMentionedMap.value)
  cargando.value = true
  errorMsg.value = ''
  pagina.value = 0
  hayMasMensajes.value = true
  usuarioScrolledUp.value = false
  if (esMovil.value) cerrarSidebar()

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

async function cargarListaCanales() {
  cargandoLista.value = true
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

async function abrirListaCanales() {
  mostrarListaCanales.value = true
  pestanaLista.value = 'oficiales'
  await cargarListaCanales()
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

function extraerError(e: any, fallback: string): string {
  const data = e?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  return data.error || data.message || data.mensaje || data.imagenFile || fallback
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

// Al abrir la confirmacion de borrado el boton que la dispara desaparece: sin
// mover el foco el usuario de teclado se queda sin punto de anclaje dentro del
// dialogo. Lo llevamos al campo de contrasena y, al cancelar, de vuelta al boton.
async function abrirEliminarCanal() {
  mostrarEliminarCanal.value = true
  await nextTick()
  passwordEliminarCanalRef.value?.focus()
}

async function cancelarEliminarCanal() {
  mostrarEliminarCanal.value = false
  await nextTick()
  botonEliminarCanalRef.value?.focus()
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

function handleBeforeUnload() {
  // Solo desconectamos el WebSocket (presencia). Las sesiones de personaje
  // se mantienen activas en el servidor para poder restaurarlas al volver.
  try { websocketService.disconnect() } catch {}
}

onMounted(async () => {
  consultaMovil.addEventListener('change', alCambiarLayout)
  consultaCompacta.addEventListener('change', alCambiarLayout)
  document.addEventListener('keydown', alPulsarEscape)
  document.addEventListener('click', cerrarEstadoFuera)
  document.addEventListener('click', cerrarAccionesFuera)
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
  consultaMovil.removeEventListener('change', alCambiarLayout)
  consultaCompacta.removeEventListener('change', alCambiarLayout)
  document.removeEventListener('keydown', alPulsarEscape)
  document.removeEventListener('click', cerrarEstadoFuera)
  document.removeEventListener('click', cerrarAccionesFuera)
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
  <div v-if="characterSessionStore.sesiones.value.length === 0" class="chat-fullpage chat-seleccion bg-gradient-selection d-flex flex-column align-items-center" @contextmenu.prevent>
    <div class="container my-auto chat-seleccion__inner">
      <div class="text-center mb-4">
        <h1 class="fw-bold d-flex align-items-center justify-content-center gap-2">
          <span class="brand-wordmark">Play<span class="brand-wordmark__accent">Lore</span></span>
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
                 class="pl-avatar mx-auto mb-2"
                 width="64" height="64"
                 alt="" />
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
    <div class="chat-tabs-bar d-flex align-items-center px-2 flex-shrink-0">
      <div v-for="(sesion, idx) in characterSessionStore.sesiones.value"
           :key="sesion.tokenJwt"
           class="chat-tab d-flex align-items-center gap-1 ps-1 pe-2 py-1"
           :class="{ active: idx === characterSessionStore.sesionActualIdx.value, 'chat-tab-unread': (noLeidosCharacter.get(sesion.personajeId) ?? 0) > 0 }">
        <button type="button"
                class="chat-tab__principal d-flex align-items-center gap-2 border-0 bg-transparent px-2 py-1"
                :aria-current="idx === characterSessionStore.sesionActualIdx.value ? 'true' : undefined"
                :aria-label="`Cambiar al personaje ${sesion.personajeNombre}`"
                @click="cambiarSesion(idx)">
          <span class="position-relative">
            <img :src="avatarUrl(sesion.personajeAvatar)"
                 class="pl-avatar" width="28" height="28" alt="" />
            <span class="tab-status-dot" :style="{ background: getTabStatusColor(sesion.personajeId) }"></span>
            <span class="visually-hidden">{{ etiquetaEstado(sesion.personajeId) }}</span>
          </span>
          <span class="small fw-medium text-truncate">{{ sesion.personajeNombre }}</span>
          <span v-if="(noLeidosCharacter.get(sesion.personajeId) ?? 0) > 0" class="unread-count">
            {{ noLeidosCharacter.get(sesion.personajeId) }}<span class="visually-hidden"> mensajes sin leer</span>
          </span>
        </button>
        <button type="button" class="chat-tab__cerrar btn btn-sm p-0 text-muted"
                :aria-label="`Desconectar al personaje ${sesion.personajeNombre}`"
                @click.stop="confirmarDesconectar(idx)">
          <i class="bi bi-x" aria-hidden="true"></i>
        </button>
      </div>
      <button v-if="characterSessionStore.sesiones.value.length < characterSessionStore.MAX_SESIONES"
              class="chat-tab-add d-flex align-items-center justify-content-center border-0 bg-transparent px-3 py-2"
              @click="mostrarSelectorPersonajes = true"
              aria-label="Añadir otro personaje">
        <i class="bi bi-plus-lg" aria-hidden="true"></i>
      </button>
    </div>

    <!-- Estado de la conexion: solo aparece cuando ya se intento conectar -->
    <div v-if="conexionSolicitada && !wsConectado" class="chat-conexion-banner"
         role="status" aria-live="polite">
      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      <span v-if="reconectando">Sin conexión con el chat. Reintentando cada 5 segundos; los mensajes nuevos pueden tardar en aparecer.</span>
      <span v-else>Conectando con el chat…</span>
    </div>

    <div class="d-flex flex-grow-1 min-h-0">
      <!-- Sidebar -->
      <aside id="chat-sidebar" ref="sidebarRef" class="chat-sidebar d-flex flex-column"
             :class="{ 'd-none d-md-flex': !sidebarVisible }"
             aria-label="Canales y conversaciones">
        <div class="chat-sidebar__cabecera d-md-none">
          <span class="chat-sidebar__titulo">Canales y conversaciones</span>
          <button type="button" class="chat-sidebar__cerrar" aria-label="Cerrar canales" @click="cerrarSidebar(true)">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        <!-- Perfil del personaje activo -->
        <div class="sidebar-profile">
          <div class="d-flex align-items-center gap-3">
            <button type="button" class="sidebar-profile__avatar position-relative border-0 bg-transparent p-0"
                    :aria-label="`Ver el perfil de ${characterSessionStore.sesionActual.value?.personajeNombre ?? 'tu personaje'}`"
                    @click="verPerfil(characterSessionStore.sesionActual.value?.personajeId)">
              <img :src="avatarUrl(characterSessionStore.sesionActual.value?.personajeAvatar)"
                   class="pl-avatar" width="44" height="44" alt="" />
              <span class="status-indicator" :style="{ background: statusColor }" aria-hidden="true"></span>
            </button>
            <div class="flex-grow-1 min-w-0 position-relative">
              <button type="button" class="sidebar-profile__nombre border-0 bg-transparent p-0 w-100 text-start"
                      @click="verPerfil(characterSessionStore.sesionActual.value?.personajeId)">
                <span class="sidebar-profile__nombre-texto text-truncate d-block">
                  {{ characterSessionStore.sesionActual.value?.personajeNombre }}
                </span>
              </button>
              <button type="button" class="dropdown-estado" :aria-expanded="mostrarSelectorEstado"
                      aria-haspopup="menu" aria-controls="chat-estado-menu"
                      @click="mostrarSelectorEstado = !mostrarSelectorEstado">
                <i class="bi" :class="statusOptions.find(s=>s.value===estadoActual)?.icon"
                   :style="{ color: statusColor }" aria-hidden="true"></i>
                <span>{{ statusOptions.find(s=>s.value===estadoActual)?.label }}</span>
              </button>
              <div v-if="mostrarSelectorEstado" id="chat-estado-menu" class="estado-dropdown-menu"
                   role="menu" aria-label="Estado de presencia" @keydown="alNavegarMenuEstado">
                <button v-for="opt in statusOptions" :key="opt.value" type="button"
                        class="dropdown-item-estado" role="menuitemradio"
                        :aria-checked="estadoActual === opt.value"
                        @click="cambiarEstado(opt.value)">
                  <i class="bi" :class="opt.icon" :style="{ color: opt.color }" aria-hidden="true"></i> {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Mensajes Privados -->
        <section v-if="conversacionesPrivadas.length > 0" class="sidebar-pm border-bottom" aria-labelledby="chat-pm-titulo">
          <h2 id="chat-pm-titulo" class="sidebar-lista__titulo">Mensajes privados</h2>
          <ul class="sidebar-lista">
            <li v-for="conv in conversacionesPrivadas" :key="conv.personajeId"
                class="channel-item-wrap position-relative">
              <button type="button"
                      class="channel-item w-100 d-flex align-items-center gap-3"
                      :class="{ active: conversacionActiva?.personajeId === conv.personajeId, 'channel-unread': (noLeidosPriv.get(conv.personajeId) ?? 0) > 0 }"
                      :aria-current="conversacionActiva?.personajeId === conv.personajeId ? 'true' : undefined"
                      @click="abrirConversacion(conv)">
                <span class="position-relative flex-shrink-0">
                  <img :src="avatarUrl(conv.personajeAvatar)" class="pl-avatar" width="32" height="32" alt="" />
                  <span v-if="(noLeidosPriv.get(conv.personajeId) ?? 0) > 0" class="unread-dot" aria-hidden="true"></span>
                </span>
                <span class="flex-grow-1 min-w-0">
                  <span class="d-flex align-items-center gap-2">
                    <span class="channel-item__nombre text-truncate">{{ conv.personajeNombre }}</span>
                    <span v-if="(noLeidosPriv.get(conv.personajeId) ?? 0) > 0" class="unread-count">
                      {{ noLeidosPriv.get(conv.personajeId) }}<span class="visually-hidden"> mensajes sin leer</span>
                    </span>
                  </span>
                  <span class="channel-item__meta text-truncate d-block">{{ conv.ultimoMensaje }}</span>
                </span>
              </button>
              <button type="button"
                      class="conversation-close-btn btn border-0 p-0 position-absolute d-flex align-items-center justify-content-center"
                      :aria-label="`Eliminar la conversación con ${conv.personajeNombre}`"
                      @click.stop="pedirEliminarConversacion(conv)">
                <i class="bi bi-x" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
        </section>

        <!-- Botón Lista de canales -->
        <div class="sidebar-acciones">
          <button type="button" class="pl-btn pl-btn--primary pl-btn--sm w-100"
                  @click="abrirListaCanales">
            <i class="bi bi-list-ul" aria-hidden="true"></i> Lista de canales
          </button>
        </div>

        <!-- Lista de canales -->
        <nav class="sidebar-channels flex-grow-1 overflow-auto" aria-label="Canales unidos">
          <div v-if="cargandoCanales" class="text-center py-4" role="status">
            <span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
            <span class="visually-hidden">Cargando canales</span>
          </div>
          <p v-else-if="canalesUnidos.length === 0" class="pl-empty-state pl-empty-state--compact mb-0">
            No estás en ningún canal todavía.
          </p>
          <ul v-else class="sidebar-lista">
            <li v-for="canal in canalesUnidos" :key="canal.id">
              <button type="button"
                      class="channel-item w-100 d-flex align-items-center gap-3"
                      :class="{ active: canalActivo?.id === canal.id, 'channel-unread': (unreadCountMap.get(canal.id) ?? 0) > 0, 'channel-mentioned': channelMentionedMap.get(canal.id) ?? false }"
                      :aria-current="canalActivo?.id === canal.id ? 'true' : undefined"
                      @click="seleccionarCanal(canal)">
                <span class="position-relative flex-shrink-0">
                  <img :src="canalAvatar(canal)" class="rounded-circle" width="32" height="32" alt="" />
                  <span v-if="(unreadCountMap.get(canal.id) ?? 0) > 0" class="unread-dot" aria-hidden="true"></span>
                </span>
                <span class="flex-grow-1 min-w-0">
                  <span class="d-flex justify-content-between align-items-center gap-2">
                    <span class="channel-item__nombre text-truncate">{{ canal.nombre }}</span>
                    <span class="d-flex align-items-center gap-1 flex-shrink-0">
                      <span v-if="channelMentionedMap.get(canal.id) ?? false" class="mention-badge"
                            title="Te han mencionado">
                        @<span class="visually-hidden">Te han mencionado</span>
                      </span>
                      <span v-if="canal.miRol" class="badge bg-secondary pl-text-xs">{{ canal.miRol }}</span>
                    </span>
                  </span>
                  <span class="channel-item__meta d-block">{{ canal.miembroCount }} miembros</span>
                </span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Overlay móvil para sidebar -->
      <div v-if="sidebarVisible && esMovil" class="sidebar-overlay"
           @click="cerrarSidebar(true)"></div>

      <!-- Área principal -->
      <main class="chat-main flex-grow-1 d-flex flex-column overflow-hidden position-relative">
        <!-- Sin canal ni conversación seleccionada -->
        <div v-if="!canalActivo && !conversacionActiva" class="chat-vacio">
          <span class="pl-empty-state__icon"><i class="bi bi-chat-dots" aria-hidden="true"></i></span>
          <h1 class="chat-vacio__titulo">Selecciona un canal o conversación</h1>
          <p class="chat-vacio__texto">Elige un canal o una conversación privada de la barra lateral.</p>
          <button ref="botonCanalesRef" type="button" class="pl-btn pl-btn--secondary pl-btn--sm d-md-none"
                  :aria-expanded="sidebarVisible" aria-controls="chat-sidebar"
                  @click="abrirSidebar">
            <i class="bi bi-list" aria-hidden="true"></i> Mostrar canales
          </button>
        </div>

        <!-- Canal seleccionado -->
        <template v-else-if="canalActivo">
          <div class="chat-header d-flex align-items-center gap-2 px-3 py-2 border-bottom">
            <button ref="botonCanalesRef" type="button" class="chat-header__btn d-md-none"
                    :aria-expanded="sidebarVisible" aria-controls="chat-sidebar"
                    :aria-label="sidebarVisible ? 'Ocultar canales' : 'Mostrar canales'"
                    @click="alternarSidebar">
              <i class="bi bi-list" aria-hidden="true"></i>
            </button>
            <img :src="canalAvatar(canalActivo)" class="rounded-circle flex-shrink-0" width="32" height="32" alt="" />
            <div class="flex-grow-1 min-w-0">
              <h1 class="chat-header__titulo text-truncate">{{ canalActivo.nombre }}</h1>
              <div class="chat-header__meta d-flex align-items-center gap-2">
                <ExpandableText :text="canalActivo.descripcion" :max-lines="1" class="flex-grow-1" />
                <button v-if="canalActivo.miembroCount != null" type="button"
                        class="miembros-link flex-shrink-0"
                        :aria-label="`Ver los ${canalActivo.miembroCount} miembros del canal`"
                        @click="abrirListaMiembros">
                  <i class="bi bi-people-fill" aria-hidden="true"></i> {{ canalActivo.miembroCount }} miembros
                </button>
              </div>
            </div>

            <div class="chat-header__acciones d-flex align-items-center gap-1">
              <button ref="botonConectadosRef" type="button" class="chat-header__btn"
                      :aria-expanded="mostrarConectados" aria-controls="chat-conectados"
                      :aria-label="mostrarConectados ? 'Ocultar conectados' : 'Mostrar conectados'"
                      @click="mostrarConectados = !mostrarConectados">
                <i class="bi bi-person-check" aria-hidden="true"></i>
              </button>
              <button type="button" class="chat-header__btn" aria-label="Buscar mensajes" @click="abrirBuscador">
                <i class="bi bi-search" aria-hidden="true"></i>
              </button>

              <!-- Acciones secundarias: visibles en escritorio, en un menú en móvil -->
              <button v-if="miRolEnCanal !== 'OWNER'" type="button"
                      class="chat-header__btn d-none d-md-inline-flex" aria-label="Denunciar canal"
                      @click="denunciarCanalActivo">
                <i class="bi bi-flag" aria-hidden="true"></i>
              </button>
              <button v-if="miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN'" type="button"
                      class="chat-header__btn d-none d-md-inline-flex" aria-label="Ver personajes baneados del canal"
                      @click="abrirModalBaneados">
                <i class="bi bi-hammer" aria-hidden="true"></i>
              </button>
              <button v-if="miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN'" type="button"
                      class="chat-header__btn d-none d-md-inline-flex" aria-label="Editar canal"
                      @click="abrirModalEditarCanal">
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button v-if="miRolEnCanal !== 'OWNER'" type="button"
                      class="chat-header__btn chat-header__btn--peligro d-none d-md-inline-flex"
                      aria-label="Salir del canal" @click="salirDelCanal">
                <i class="bi bi-box-arrow-left" aria-hidden="true"></i>
              </button>

              <div class="position-relative d-md-none">
                <button type="button" class="chat-header__btn"
                        :aria-expanded="mostrarAccionesCanal" aria-haspopup="menu"
                        aria-controls="chat-acciones-canal" aria-label="Más acciones del canal"
                        @click="mostrarAccionesCanal = !mostrarAccionesCanal">
                  <i class="bi bi-three-dots-vertical" aria-hidden="true"></i>
                </button>
                <div v-if="mostrarAccionesCanal" id="chat-acciones-canal" class="chat-acciones-menu"
                     role="menu" aria-label="Acciones del canal" @keydown="alNavegarMenuAcciones">
                  <button v-if="miRolEnCanal !== 'OWNER'" type="button" role="menuitem"
                          class="chat-acciones-menu__item"
                          @click="mostrarAccionesCanal = false; denunciarCanalActivo()">
                    <i class="bi bi-flag" aria-hidden="true"></i> Denunciar canal
                  </button>
                  <button v-if="miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN'" type="button"
                          role="menuitem" class="chat-acciones-menu__item"
                          @click="mostrarAccionesCanal = false; abrirModalBaneados()">
                    <i class="bi bi-hammer" aria-hidden="true"></i> Baneados del canal
                  </button>
                  <button v-if="miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN'" type="button"
                          role="menuitem" class="chat-acciones-menu__item"
                          @click="mostrarAccionesCanal = false; abrirModalEditarCanal()">
                    <i class="bi bi-pencil" aria-hidden="true"></i> Editar canal
                  </button>
                  <button v-if="miRolEnCanal !== 'OWNER'" type="button" role="menuitem"
                          class="chat-acciones-menu__item chat-acciones-menu__item--peligro"
                          @click="mostrarAccionesCanal = false; salirDelCanal()">
                    <i class="bi bi-box-arrow-left" aria-hidden="true"></i> Salir del canal
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Buscador de mensajes -->
          <div v-if="busquedaAbierta" class="busqueda-panel position-absolute start-0 end-0 z-3 bg-white shadow-sm border-bottom">
            <div class="d-flex align-items-center gap-2 px-3 py-2">
              <i class="bi bi-search text-muted"></i>
              <input ref="buscadorInputRef"
                     v-model="terminoBusqueda"
                     type="text"
                     class="form-control form-control-sm"
                     aria-label="Buscar en el canal"
                     placeholder="Buscar en el canal..."
                     @keydown.enter.prevent="buscar(terminoBusqueda)"
                     @keydown.esc.prevent="cerrarBuscador" />
              <button class="btn btn-sm btn-outline-secondary" :disabled="buscando || !terminoBusqueda.trim()" @click="buscar(terminoBusqueda)" aria-label="Buscar en el canal" title="Buscar">
                <span v-if="buscando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <i v-else class="bi bi-arrow-return-left" aria-hidden="true"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" @click="cerrarBuscador" aria-label="Cerrar buscador" title="Cerrar">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <div class="busqueda-resultados overflow-auto">
              <div v-if="buscando" class="text-center text-muted py-4">
                <div class="spinner-border spinner-border-sm text-primary"></div>
                <div class="small mt-1">Buscando...</div>
              </div>
              <div v-else-if="errorBusqueda" class="text-center text-danger small py-4">{{ errorBusqueda }}</div>
              <div v-else-if="resultados.length === 0 && terminoBusqueda" class="text-center text-muted small py-4">
                Sin resultados para "{{ terminoBusqueda }}"
              </div>
              <div v-else>
                <button v-for="r in resultados" :key="r.id"
                        class="busqueda-resultado w-100 d-flex align-items-start gap-2 text-start border-0 bg-transparent px-3 py-2"
                        :aria-label="'Saltar al mensaje de ' + (r.personajeNombre || '')"
                        :title="'Saltar al mensaje de ' + (r.personajeNombre || '')"
                        @click="saltarAResultado(r)">
                  <img :src="avatarUrl(r.personajeAvatar)" class="pl-avatar flex-shrink-0" width="24" height="24" alt="" />
                  <span class="flex-grow-1 min-w-0">
                    <span class="d-flex justify-content-between gap-2">
                      <small class="fw-bold text-truncate">{{ r.personajeNombre }}</small>
                      <small class="text-muted flex-shrink-0 pl-text-xs">{{ formatFecha(r.fechaEnvio) }}</small>
                    </span>
                    <span class="d-block text-body small text-truncate">{{ truncarTexto(r.contenido || '', 120) }}</span>
                  </span>
                </button>
                <div v-if="hayMasResultados" class="text-center py-2">
                  <button class="btn btn-sm btn-outline-secondary" :disabled="cargandoMasResultados" @click="cargarMasResultados">
                    <span v-if="cargandoMasResultados" class="spinner-border spinner-border-sm"></span>
                    <template v-else>Cargar más resultados</template>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Mensajes -->
          <div ref="mensajesContainer" class="chat-mensajes flex-grow-1 p-3 overflow-auto"
               @scroll="handleScroll"
               @click="handleMentionClick">
            <div v-if="cargando" class="chat-mensajes__estado" role="status">
              <span class="spinner-border text-primary spinner-border-sm" aria-hidden="true"></span>
              <span>Cargando mensajes</span>
            </div>
            <div v-else-if="errorMsg" class="pl-alert pl-alert--danger" role="alert">
              <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
              <span>{{ errorMsg }}</span>
            </div>
            <template v-else-if="mensajes.length > 0">
              <div v-if="cargandoMas" class="chat-mensajes__estado" role="status">
                <span class="spinner-border spinner-border-sm text-secondary" aria-hidden="true"></span>
                <span>Cargando mensajes anteriores</span>
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
            <div v-else class="pl-empty-state pl-empty-state--compact chat-mensajes__vacio">
              <span class="pl-empty-state__icon"><i class="bi bi-chat-dots" aria-hidden="true"></i></span>
              <p class="mb-0">No hay mensajes aún. ¡Sé el primero!</p>
            </div>
          </div>

          <!-- Botón volver al final -->
          <transition name="fade">
            <button v-if="usuarioScrolledUp" class="btn btn-light btn-sm rounded-pill shadow scroll-bottom-btn position-absolute"
                    @click="scrollAlFinalForzado" aria-label="Ir al último mensaje" title="Ir al último mensaje">
              <i class="bi bi-arrow-down" aria-hidden="true"></i>
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
          <div class="chat-header d-flex align-items-center gap-2 px-3 py-2 border-bottom">
            <button type="button" class="chat-header__btn" aria-label="Volver a los canales" @click="cerrarConversacion">
              <i class="bi bi-arrow-left" aria-hidden="true"></i>
            </button>
            <button type="button" class="sidebar-profile__avatar flex-shrink-0 border-0 bg-transparent p-0"
                    :aria-label="`Ver el perfil de ${conversacionActiva.personajeNombre}`"
                    @click="verPerfil(conversacionActiva.personajeId)">
              <img :src="avatarUrl(conversacionActiva.personajeAvatar)" class="pl-avatar"
                   width="32" height="32" alt="" />
            </button>
            <div class="flex-grow-1 min-w-0">
              <h1 class="chat-header__titulo text-truncate">{{ conversacionActiva.personajeNombre }}</h1>
              <p class="chat-header__meta mb-0">Conversación privada</p>
            </div>
            <button type="button" class="chat-header__btn" aria-label="Ver perfil" @click="verPerfil(conversacionActiva.personajeId)">
              <i class="bi bi-person-vcard" aria-hidden="true"></i>
            </button>
            <button type="button" class="chat-header__btn chat-header__btn--peligro"
                    aria-label="Cerrar conversación" @click="cerrarConversacion">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </div>

          <!-- PM Messages -->
          <div ref="mensajesContainer" class="chat-mensajes flex-grow-1 p-3 overflow-auto"
               @click="handleMentionClick">
            <div v-if="cargandoPriv" class="chat-mensajes__estado" role="status">
              <span class="spinner-border text-primary spinner-border-sm" aria-hidden="true"></span>
              <span>Cargando conversación</span>
            </div>
            <template v-else-if="mensajesPrivados.length > 0">
              <ChatMessage v-for="msg in mensajesPrivados" :key="msg.id"
                :msg="msg"
                :es-mio="msg.esMio"
                :avatar-src="msg.esMio ? avatarUrl(characterSessionStore.sesionActual.value?.personajeAvatar) : avatarUrl(conversacionActiva.personajeAvatar)"
                @ver-perfil="verPerfil"
              />
            </template>
            <div v-else class="pl-empty-state pl-empty-state--compact chat-mensajes__vacio">
              <span class="pl-empty-state__icon"><i class="bi bi-chat-dots" aria-hidden="true"></i></span>
              <p class="mb-0">No hay mensajes aún. Envía un mensaje para iniciar la conversación.</p>
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
      <div v-if="mostrarConectados && esCompacto" class="chat-right-sidebar-overlay"
           @click="cerrarConectados"></div>
      <aside v-if="canalActivo && mostrarConectados" id="chat-conectados"
             class="chat-right-sidebar flex-column"
             aria-label="Personajes conectados">
        <div class="chat-right-sidebar__cabecera">
          <h2 class="chat-sidebar__titulo mb-0">Conectados ({{ miembrosOnline.length }})</h2>
          <button type="button" class="btn-close btn-close-sm" aria-label="Ocultar conectados" @click="cerrarConectados"></button>
        </div>
        <div v-if="cargandoMiembrosOnline" class="chat-right-sidebar__estado" role="status">
          <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <span>Cargando conectados</span>
        </div>
        <p v-else-if="miembrosOnline.length === 0" class="chat-right-sidebar__estado">
          No hay personajes conectados
        </p>
        <ul v-else class="miembros-panel">
          <li v-for="m in miembrosOnline" :key="m.id" class="miembro-fila"
              @contextmenu.prevent="abrirContextMenu($event, m)">
            <button type="button" class="miembro-fila__perfil"
                    :aria-label="`Ver el perfil de ${m.personajeNombre}`"
                    @click="verPerfil(m.personajeId)">
              <span class="miembro-fila__avatar">
                <img :src="avatarUrl(m.personajeAvatar)" class="rounded-circle" width="32" height="32" alt="" />
                <span class="online-dot" :style="{ background: getStatusColor(statusMap.get(m.personajeId)) }" aria-hidden="true"></span>
              </span>
              <span class="miembro-fila__nombre text-truncate">{{ m.personajeNombre }}</span>
              <span class="visually-hidden">{{ etiquetaEstado(m.personajeId) }}</span>
            </button>
            <i v-if="m.rol === 'OWNER'" role="img" aria-label="Dueño del canal"
               class="bi bi-key-fill miembro-fila__rol miembro-fila__rol--owner"></i>
            <i v-else-if="m.rol === 'MOD'" role="img" aria-label="Moderador"
               class="bi bi-shield-fill-check miembro-fila__rol miembro-fila__rol--mod"></i>
            <i v-if="estaSilenciado(m)" role="img"
               :aria-label="'Silenciado hasta ' + new Date(m.silenciadoHasta).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })"
               class="bi bi-volume-mute-fill miembro-fila__silencio"></i>
            <button type="button" class="miembro-fila__acciones"
                    :aria-label="`Acciones sobre ${m.personajeNombre}`"
                    aria-haspopup="menu"
                    :aria-expanded="contextMenuTarget?.id === m.id"
                    @click="abrirContextMenuDesde($event.currentTarget as HTMLElement, m)">
              <i class="bi bi-three-dots-vertical" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
      </aside>
    </div>
  </div>

  <!-- Modal: Lista de miembros -->
  <ModalFormulario v-if="mostrarListaMiembros" titulo="Miembros" @cerrar="mostrarListaMiembros = false">
    <div v-if="cargandoMiembros && miembrosLista.length === 0" class="chat-mensajes__estado" role="status">
      <span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
      <span>Cargando miembros</span>
    </div>
    <div v-else class="miembros-lista">
      <ul class="chat-miembros-lista">
        <li v-for="m in miembrosLista" :key="m.id" class="chat-miembros-lista__fila">
          <img :src="avatarUrl(m.personajeAvatar)" class="pl-avatar flex-shrink-0"
               width="36" height="36" alt="" />
          <div class="flex-grow-1 min-w-0">
            <div class="fw-medium small text-truncate">{{ m.personajeNombre }}</div>
            <span class="badge chat-rol-badge" :class="`chat-rol-badge--${(m.rol || 'MEMBER').toLowerCase()}`">
              {{ m.rol }}
            </span>
          </div>
        </li>
      </ul>
      <div v-if="cargandoMiembros && miembrosLista.length > 0" class="chat-mensajes__estado" role="status">
        <span class="spinner-border spinner-border-sm text-secondary" aria-hidden="true"></span>
        <span>Cargando más miembros</span>
      </div>
      <button v-if="hayMasMiembros && !cargandoMiembros" type="button"
              class="btn btn-outline-primary btn-sm w-100 mt-2" @click="cargarMasMiembros">
        Mostrar más
      </button>
      <p v-if="!hayMasMiembros && miembrosLista.length > 0" class="text-center text-muted small py-2 mb-0">
        Todos los miembros cargados
      </p>
    </div>
  </ModalFormulario>

  <!-- Modal selector de personajes (para añadir más) -->
  <ModalFormulario v-if="mostrarSelectorPersonajes" titulo="Seleccionar personaje" ancho="md" @cerrar="mostrarSelectorPersonajes = false">
    <p v-if="personajes.length === 0" class="text-muted small text-center py-3 mb-0">
      No tienes más personajes disponibles
    </p>
    <div class="row g-2">
      <div v-for="p in personajes" :key="p.idPersonaje ?? p.id" class="col-6">
        <button type="button" class="card personaje-card h-100 w-100 border-0 shadow-sm text-center p-3"
                :aria-label="`Entrar al chat con ${p.nombre}`"
                :disabled="characterSessionStore.sesiones.value.some((s:any) => s.personajeId === (p.idPersonaje ?? p.id))"
                @click="iniciarSesionPersonaje(p.idPersonaje ?? p.id)">
          <img :src="avatarUrl(p.avatar)" class="pl-avatar mx-auto mb-2"
               width="48" height="48" alt="" />
          <h6 class="mb-0 text-truncate small">{{ p.nombre }}</h6>
          <small class="text-muted d-block pl-text-xs">{{ p.raza || '—' }}</small>
          <small class="text-muted d-block pl-text-xs">{{ p.clase || '' }}</small>
        </button>
      </div>
    </div>
  </ModalFormulario>

  <!-- Modal: Lista de canales -->
  <ModalFormulario v-if="mostrarListaCanales" titulo="Lista de canales" ancho="md" @cerrar="mostrarListaCanales = false">
    <div class="chat-lista-tabs" role="tablist" aria-label="Tipo de canal">
      <button type="button" class="chat-lista-tabs__tab" role="tab"
              :aria-selected="pestanaLista === 'oficiales'" :class="{ active: pestanaLista === 'oficiales' }"
              @click="pestanaLista = 'oficiales'">Canales oficiales</button>
      <button type="button" class="chat-lista-tabs__tab" role="tab"
              :aria-selected="pestanaLista === 'usuarios'" :class="{ active: pestanaLista === 'usuarios' }"
              @click="pestanaLista = 'usuarios'">Canales de usuarios</button>
    </div>

    <div v-if="cargandoLista" class="chat-mensajes__estado" role="status">
      <span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
      <span>Cargando canales</span>
    </div>
    <template v-else-if="pestanaLista === 'oficiales'">
      <p v-if="canalesOficiales.length === 0" class="text-muted small text-center py-3 mb-0">
        No hay canales oficiales disponibles
      </p>
      <ul v-else class="chat-canales-lista">
        <li v-for="c in canalesOficiales" :key="c.id">
          <button type="button" class="chat-canal-fila" :aria-label="`Unirse al canal ${c.nombre}`" @click="unirseACanal(c.id)">
            <img :src="canalAvatar(c)" class="rounded-circle flex-shrink-0" width="36" height="36" alt="" />
            <span class="flex-grow-1 min-w-0">
              <span class="chat-canal-fila__nombre text-truncate">{{ c.nombre }}</span>
              <span class="chat-canal-fila__meta">{{ c.descripcion || 'Sin descripción' }} · {{ c.miembroCount }} miembros</span>
            </span>
            <span class="chat-canal-fila__accion">Unirse</span>
          </button>
        </li>
      </ul>
    </template>
    <template v-else>
      <p v-if="canalesUsuarios.length === 0" class="text-muted small text-center py-3 mb-0">
        No hay canales de usuarios disponibles
      </p>
      <ul v-else class="chat-canales-lista">
        <li v-for="c in canalesUsuarios" :key="c.id">
          <button type="button" class="chat-canal-fila"
                  :class="{ 'chat-canal-fila--activo': canalActivo?.id === c.id }"
                  :aria-current="canalActivo?.id === c.id ? 'true' : undefined"
                  :aria-label="canalActivo?.id === c.id ? `Cerrar la lista, ya estas en ${c.nombre}` : `Unirse al canal ${c.nombre}`"
                  @click="canalActivo?.id !== c.id ? unirseACanal(c.id) : (mostrarListaCanales = false)">
            <img :src="canalAvatar(c)" class="rounded-circle flex-shrink-0" width="36" height="36" alt="" />
            <span class="flex-grow-1 min-w-0">
              <span class="chat-canal-fila__nombre text-truncate">{{ c.nombre }}</span>
              <span class="chat-canal-fila__meta">{{ c.descripcion || 'Sin descripción' }} · {{ c.miembroCount }} miembros</span>
            </span>
            <span v-if="c.miRol" class="badge chat-rol-badge" :class="`chat-rol-badge--${(c.miRol || 'member').toLowerCase()}`">{{ c.miRol }}</span>
          </button>
        </li>
      </ul>
      <hr class="my-2" />
      <button type="button" class="btn btn-primary btn-sm w-100" @click="abrirModalCrear">
        <i class="bi bi-plus-lg" aria-hidden="true"></i> Crear nuevo canal
      </button>
    </template>
  </ModalFormulario>

  <!-- Modal: Crear canal -->
  <ModalFormulario v-if="mostrarModalCrear" titulo="Crear nuevo canal" ancho="md" @cerrar="cerrarModalCrear">
    <div class="mb-3">
      <label class="form-label" for="chat-canal-nombre">Nombre del canal</label>
      <input id="chat-canal-nombre" v-model="nuevoCanalData.nombre" type="text" class="form-control form-control-sm" maxlength="100" />
    </div>
    <div class="mb-3">
      <label class="form-label" for="chat-canal-descripcion">Descripción</label>
      <textarea id="chat-canal-descripcion" v-model="nuevoCanalData.descripcion" class="form-control form-control-sm" rows="2" maxlength="500"></textarea>
    </div>
    <div class="mb-3">
      <label class="form-label">Imagen del canal (opcional)</label>
      <div class="d-flex align-items-center gap-3">
        <img v-if="imagenPreview" :src="imagenPreview" class="pl-avatar" width="48" height="48" alt="" />
        <div v-else class="chat-canal-avatar-placeholder" aria-hidden="true">
          {{ nuevoCanalData.nombre ? nuevoCanalData.nombre.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : '?' }}
        </div>
        <div class="flex-grow-1">
          <input type="file" ref="inputImagenRef" class="d-none" accept="image/jpeg,image/png,image/webp" @change="onImagenCanalChange" />
          <button type="button" class="btn btn-outline-secondary btn-sm me-2" @click="inputImagenRef?.click()">
            <i class="bi bi-image" aria-hidden="true"></i> Seleccionar
          </button>
          <button v-if="imagenPreview || imagenCanal" type="button" class="btn btn-outline-danger btn-sm"
                  aria-label="Quitar la imagen del canal" @click="quitarImagenCanal">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="mb-3 form-check">
      <input v-model="nuevoCanalData.privado" type="checkbox" class="form-check-input" id="chkPrivado" />
      <label class="form-check-label small" for="chkPrivado">Canal privado (solo por invitación)</label>
    </div>
    <div v-if="errorCrear" class="pl-alert pl-alert--danger py-2 small" role="alert">
      <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
      <span>{{ errorCrear }}</span>
    </div>
    <div class="d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-outline-secondary" @click="cerrarModalCrear">Cancelar</button>
      <button type="button" class="btn btn-primary" @click="crearCanal">
        <i class="bi bi-check-lg" aria-hidden="true"></i> Crear
      </button>
    </div>
  </ModalFormulario>

  <!-- Modal editar canal -->
  <ModalFormulario v-if="mostrarModalEditarCanal" titulo="Editar canal" ancho="md" @cerrar="mostrarModalEditarCanal = false">
    <div class="mb-3">
      <label class="form-label" for="chat-editar-nombre">Nombre del canal</label>
      <input id="chat-editar-nombre" v-model="editarCanalData.nombre" type="text" class="form-control form-control-sm" maxlength="100" />
    </div>
    <div class="mb-3">
      <label class="form-label" for="chat-editar-descripcion">Descripción</label>
      <textarea id="chat-editar-descripcion" v-model="editarCanalData.descripcion" class="form-control form-control-sm" rows="2" maxlength="500"></textarea>
    </div>
    <div class="mb-3">
      <label class="form-label">Imagen del canal</label>
      <div class="d-flex align-items-center gap-3">
        <img v-if="imagenEdicionSrc" :src="imagenEdicionSrc" class="pl-avatar flex-shrink-0" width="48" height="48" alt="" />
        <div v-else class="chat-canal-avatar-placeholder" aria-hidden="true">
          {{ editarCanalData.nombre ? editarCanalData.nombre.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : '?' }}
        </div>
        <div class="flex-grow-1">
          <input type="file" ref="inputImagenEdicionRef" class="d-none" accept="image/jpeg,image/png,image/webp" @change="onImagenEdicionCanalChange" />
          <button type="button" class="btn btn-outline-secondary btn-sm me-2" @click="inputImagenEdicionRef?.click()">
            <i class="bi bi-image" aria-hidden="true"></i> Seleccionar
          </button>
          <button v-if="imagenEdicionPreview || imagenEdicionCanal" type="button" class="btn btn-outline-danger btn-sm"
                  aria-label="Quitar la imagen del canal" @click="quitarImagenEdicionActual">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="mb-3 form-check">
      <input v-model="editarCanalData.privado" type="checkbox" class="form-check-input" id="chkPrivadoEditar" />
      <label class="form-check-label small" for="chkPrivadoEditar">Canal privado (solo por invitación)</label>
    </div>
    <div v-if="errorEditarCanal" class="pl-alert pl-alert--danger py-2 small" role="alert">
      <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
      <span>{{ errorEditarCanal }}</span>
    </div>

    <div v-if="miRolEnCanal === 'OWNER'" class="chat-zona-peligro">
      <div class="d-flex justify-content-between align-items-center gap-2">
        <span class="chat-zona-peligro__titulo">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Zona de peligro
        </span>
        <button v-if="!mostrarEliminarCanal" ref="botonEliminarCanalRef" type="button" class="btn btn-outline-danger btn-sm" @click="abrirEliminarCanal">
          <i class="bi bi-trash" aria-hidden="true"></i> Eliminar canal
        </button>
        <button v-else type="button" class="btn btn-outline-secondary btn-sm" @click="cancelarEliminarCanal">
          <i class="bi bi-x-lg" aria-hidden="true"></i> Cancelar
        </button>
      </div>
      <div v-if="mostrarEliminarCanal" class="mt-3">
        <p class="small text-muted mb-2">
          Al eliminar el canal, todos los personajes miembros saldrán y se borrarán todos los mensajes. Esta acción no se puede deshacer.
        </p>
        <label class="form-label small" for="passwordEliminarCanal">Escribe tu contraseña para confirmar</label>
        <input v-model="passwordEliminarCanal" ref="passwordEliminarCanalRef" id="passwordEliminarCanal" type="password" class="form-control form-control-sm mb-2" placeholder="Contraseña" @keyup.enter="eliminarCanalConfirmado" />
        <div v-if="errorEliminarCanal" class="pl-alert pl-alert--danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
          <span>{{ errorEliminarCanal }}</span>
        </div>
        <button type="button" class="btn btn-danger btn-sm" :disabled="eliminandoCanal" @click="eliminarCanalConfirmado">
          <i class="bi bi-trash" aria-hidden="true"></i> {{ eliminandoCanal ? 'Eliminando...' : 'Eliminar definitivamente' }}
        </button>
      </div>
    </div>

    <div class="d-flex justify-content-end gap-2 mt-3">
      <button type="button" class="btn btn-outline-secondary" @click="mostrarModalEditarCanal = false">Cancelar</button>
      <button type="button" class="btn btn-primary" @click="guardarEdicionCanal">
        <i class="bi bi-check-lg" aria-hidden="true"></i> Guardar
      </button>
    </div>
  </ModalFormulario>

  <!-- Modal: Confirmación de eliminar mensaje -->
  <ModalConfirmacion
    v-if="mostrarConfirmacionEliminar"
    titulo="Eliminar mensaje"
    mensaje="¿Seguro que quieres eliminar este mensaje?"
    boton-confirmar="Eliminar"
    peligro
    @confirmar="ejecutarEliminarMensaje"
    @cancelar="mostrarConfirmacionEliminar = false"
  />

  <!-- Context menu: clic derecho o boton de acciones en conectados -->
  <div v-if="contextMenuTarget" class="context-menu-overlay" @click="cerrarContextMenu()" @contextmenu.prevent="cerrarContextMenu()"></div>
  <div v-if="contextMenuTarget" id="chat-miembro-menu" ref="contextMenuRef" class="context-menu"
       role="menu" :aria-label="`Acciones sobre ${contextMenuTarget.personajeNombre}`"
       :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
       @contextmenu.prevent @keydown="alNavegarMenuContexto">
    <button type="button" role="menuitem" class="context-menu-item" @click="verPerfil(contextMenuTarget.personajeId); cerrarContextMenu()">
      <i class="bi bi-person-vcard" aria-hidden="true"></i> Perfil
    </button>
    <button type="button" role="menuitem" class="context-menu-item" @click="abrirConversacionPrivada(contextMenuTarget.personajeId, contextMenuTarget.personajeNombre, contextMenuTarget.personajeAvatar)">
      <i class="bi bi-envelope" aria-hidden="true"></i> Mensaje Privado
    </button>
    <div v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN') && contextMenuTarget.rol === 'MEMBER'" class="context-menu-divider"></div>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN') && contextMenuTarget.rol === 'MEMBER'"
            type="button" role="menuitem" class="context-menu-item" @click="ascenderAMod(contextMenuTarget)">
      <i class="bi bi-shield" aria-hidden="true"></i> Ascender a moderador
    </button>
    <div v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN') && contextMenuTarget.rol === 'MOD'" class="context-menu-divider"></div>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN') && contextMenuTarget.rol === 'MOD'"
            type="button" role="menuitem" class="context-menu-item" @click="descenderAMember(contextMenuTarget)">
      <i class="bi bi-arrow-down-circle" aria-hidden="true"></i> Descender a miembro
    </button>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN' || miRolEnCanal === 'MOD')
                  && contextMenuTarget.personajeId !== characterSessionStore.sesionActual.value?.personajeId
                  && contextMenuTarget.rol !== 'OWNER' && contextMenuTarget.rol !== 'ADMIN'"
            type="button" role="menuitem" class="context-menu-item context-menu-item--peligro" @click="expulsarDelCanal(contextMenuTarget)">
      <i class="bi bi-door-open" aria-hidden="true"></i> Expulsar del canal
    </button>
    <div v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN')
              && contextMenuTarget.personajeId !== characterSessionStore.sesionActual.value?.personajeId
              && contextMenuTarget.rol !== 'OWNER' && contextMenuTarget.rol !== 'ADMIN'" class="context-menu-divider"></div>
    <button v-if="(miRolEnCanal === 'OWNER' || miRolEnCanal === 'ADMIN')
                  && contextMenuTarget.personajeId !== characterSessionStore.sesionActual.value?.personajeId
                  && contextMenuTarget.rol !== 'OWNER' && contextMenuTarget.rol !== 'ADMIN'"
            type="button" role="menuitem" class="context-menu-item context-menu-item--peligro" @click="abrirBanModal(contextMenuTarget)">
      <i class="bi bi-hammer" aria-hidden="true"></i> Banear del canal
    </button>
    <div v-if="puedeSilenciarContextMenu" class="context-menu-divider"></div>
    <button v-if="puedeSilenciarContextMenu" type="button" role="menuitem" class="context-menu-item"
            :class="estaSilenciado(contextMenuTarget) ? '' : 'context-menu-item--peligro'"
            @click="estaSilenciado(contextMenuTarget) ? desilenciar(contextMenuTarget) : abrirSilenciarModal(contextMenuTarget)">
      <i v-if="estaSilenciado(contextMenuTarget)" class="bi bi-volume-up" aria-hidden="true"></i>
      <i v-else class="bi bi-volume-mute" aria-hidden="true"></i>
      {{ estaSilenciado(contextMenuTarget) ? 'Desilenciar' : 'Silenciar' }}
    </button>
  </div>

  <!-- Modal: Banear personaje -->
  <ModalFormulario v-if="banTarget" :titulo="`Banear a ${banTarget.personajeNombre}`" @cerrar="banTarget = null">
    <p class="text-muted small mb-3">Selecciona la duración del baneo:</p>
    <div class="d-flex flex-column gap-2 mb-4" role="radiogroup" aria-label="Duración del baneo">
      <label v-for="op in opcionesBan" :key="op.value"
             class="chat-opcion-radio"
             :class="{ 'chat-opcion-radio--activa': banDuracion === op.value }">
        <input type="radio" :value="op.value" v-model="banDuracion" class="form-check-input m-0" />
        <span>{{ op.label }}</span>
      </label>
    </div>
    <div class="d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-outline-secondary" @click="banTarget = null">Cancelar</button>
      <button type="button" class="btn btn-danger" @click="confirmarBan">
        <i class="bi bi-hammer" aria-hidden="true"></i> Banear
      </button>
    </div>
  </ModalFormulario>

  <!-- Modal: Silenciar personaje -->
  <ModalFormulario v-if="silenciarTarget" :titulo="`Silenciar a ${silenciarTarget.personajeNombre}`" @cerrar="silenciarTarget = null">
    <p class="text-muted small mb-3">El personaje no podrá enviar mensajes al canal durante la duración seleccionada:</p>
    <div class="d-flex flex-column gap-2 mb-4" role="radiogroup" aria-label="Duración del silencio">
      <label v-for="op in opcionesSilenciar" :key="op.value"
             class="chat-opcion-radio"
             :class="{ 'chat-opcion-radio--activa': silenciarDuracion === op.value }">
        <input type="radio" :value="op.value" v-model="silenciarDuracion" class="form-check-input m-0" />
        <span>{{ op.label }}</span>
      </label>
    </div>
    <div class="d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-outline-secondary" @click="silenciarTarget = null">Cancelar</button>
      <button type="button" class="btn btn-danger" @click="confirmarSilenciar">
        <i class="bi bi-volume-mute" aria-hidden="true"></i> Silenciar
      </button>
    </div>
  </ModalFormulario>

  <!-- Modal: Denunciar mensaje o canal -->
  <ModalFormulario v-if="denunciaTarget" :titulo="denunciaTarget.tipo === 'CANAL' ? 'Denunciar canal' : 'Denunciar mensaje'" @cerrar="denunciaTarget = null">
    <div class="mb-3">
      <label class="form-label" for="chat-denuncia-motivo">Motivo <span class="text-danger" aria-hidden="true">*</span></label>
      <input id="chat-denuncia-motivo" v-model="denunciaMotivo" type="text" class="form-control" maxlength="200"
             :placeholder="denunciaTarget.tipo === 'CANAL' ? '¿Por qué denuncias este canal?' : '¿Por qué denuncias este mensaje?'" />
    </div>
    <div class="mb-4">
      <label class="form-label" for="chat-denuncia-detalle">Detalle (opcional)</label>
      <textarea id="chat-denuncia-detalle" v-model="denunciaDetalle" class="form-control" rows="4" maxlength="2000"
                placeholder="Amplía la información si lo necesitas..."></textarea>
      <div class="text-end text-muted small mt-1">{{ denunciaDetalle.length }}/2000</div>
    </div>
    <div class="d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-outline-secondary" @click="denunciaTarget = null">Cancelar</button>
      <button
        type="button"
        class="btn btn-warning"
        :disabled="enviandoDenuncia || !denunciaMotivo.trim()"
        @click="enviarDenunciaMensaje"
      >
        <span v-if="enviandoDenuncia" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <i v-else class="bi bi-flag" aria-hidden="true"></i>
        Enviar denuncia
      </button>
    </div>
  </ModalFormulario>

  <!-- Modal: Baneados del canal -->
  <!-- Modal: Baneados del canal -->
  <ModalFormulario v-if="mostrarBaneados" titulo="Baneados del canal" ancho="md" @cerrar="mostrarBaneados = false">
    <div v-if="cargandoBaneados" class="chat-mensajes__estado" role="status">
      <span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
      <span>Cargando baneados</span>
    </div>
    <p v-else-if="baneados.length === 0" class="text-muted small text-center py-3 mb-0">
      No hay personajes baneados.
    </p>
    <ul v-else class="chat-baneados">
      <li v-for="b in baneados" :key="b.personajeId" class="chat-baneados__fila">
        <img :src="avatarUrl(b.avatar)" class="pl-avatar flex-shrink-0" width="32" height="32" alt="" />
        <div class="flex-grow-1 min-w-0">
          <div class="small fw-medium text-truncate">{{ b.personajeNombre }}</div>
          <div class="chat-baneados__meta">
            <template v-if="b.activo">
              {{ b.fechaExpiracion ? 'Hasta ' + new Date(b.fechaExpiracion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Permanente' }}
            </template>
            <template v-else>Expirado</template>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-success flex-shrink-0"
                :aria-label="`Desbanear a ${b.personajeNombre}`" @click="desbanearPersonaje(b)">
          <i class="bi bi-unlock" aria-hidden="true"></i> Desbanear
        </button>
      </li>
    </ul>
  </ModalFormulario>

  <!-- Modal: Confirmación de eliminar conversación privada -->
  <ModalConfirmacion
    v-if="conversacionAEliminar"
    titulo="Eliminar conversación"
    :mensaje="`¿Seguro que quieres eliminar la conversación con ${conversacionAEliminar.personajeNombre}? Se borrarán los mensajes de tu bandeja.`"
    boton-confirmar="Eliminar"
    peligro
    @confirmar="confirmarEliminarConversacion"
    @cancelar="conversacionAEliminar = null"
  />

  <!-- Modal: Perfil completo del personaje (pantalla completa) -->
  <div v-if="mostrarPerfil && perfilPersonajeId" ref="perfilModalRef"
       class="modal-backdrop-custom perfil-modal-full"
       role="dialog" aria-modal="true" aria-label="Perfil del personaje" tabindex="-1"
       @click.self="cerrarPerfil" @keydown="alNavegarPerfil">
    <div class="perfil-modal-container">
      <PerfilPersonajeView
        :personaje-id="perfilPersonajeId"
        :modo-modal="true"
        @cerrar="cerrarPerfil"
      />
    </div>
  </div>

  <!-- Modal: Confirmación de desconexión -->
  <ModalConfirmacion
    v-if="mostrarConfirmacionDesconectar"
    titulo="Desconectar personaje"
    :mensaje="`¿Seguro que quieres desconectar a ${personajeDesconectar?.personajeNombre ?? ''} del chat?`"
    boton-confirmar="Desconectar"
    peligro
    @confirmar="ejecutarDesconectar"
    @cancelar="mostrarConfirmacionDesconectar = false"
  />

  <!-- Modal: Mensaje de error/info -->
  <ModalAviso v-if="mensajeModal" :titulo="mensajeModal.titulo" :mensaje="mensajeModal.texto"
              @cerrar="mensajeModal = null" />

  <!-- Modal: Confirmación genérica -->
  <ModalConfirmacion
    v-if="confirmModal"
    :titulo="confirmModal.titulo"
    :mensaje="confirmModal.texto"
    @confirmar="confirmModal.onConfirm(); confirmModal = null"
    @cancelar="confirmModal = null"
  />

  <!-- Modal: Aviso -->
  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.chat-fullpage {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--pl-bg-soft);
}
/* Selección de personaje: si la lista no cabe, scrollea en vertical. */
.chat-seleccion {
  overflow-y: auto;
}
.chat-seleccion__inner {
  width: 100%;
  max-width: 720px;
}
.bg-gradient-selection {
  background: linear-gradient(
    180deg,
    rgba(var(--pl-primary-rgb), 0.14) 0%,
    var(--pl-bg) 45%,
    var(--pl-surface) 100%
  ) !important;
}

.brand-wordmark {
  font-size: clamp(1.7rem, 4vw, 2.4rem);
  letter-spacing: -0.04em;
  line-height: 1;
}

.brand-wordmark__accent {
  color: var(--pl-cyan-ink);
}

.personaje-card {
  border-radius: var(--pl-radius-lg);
  transition: box-shadow var(--pl-duration-base) var(--pl-ease-standard);
  cursor: pointer;
  background: var(--pl-surface);
}
.personaje-card:hover {
  box-shadow: var(--pl-shadow-md);
}
@media (prefers-reduced-motion: no-preference) {
  .personaje-card {
    transition: box-shadow var(--pl-duration-base) var(--pl-ease-standard),
      transform var(--pl-duration-base) var(--pl-ease-standard);
  }
  .personaje-card:hover {
    transform: translateY(-3px);
  }
}
.personaje-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.chat-conexion-banner {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-shrink: 0;
  padding: 0.5rem 0.9rem;
  border-bottom: 1px solid rgba(var(--pl-warning-rgb), 0.35);
  background: rgba(var(--pl-warning-rgb), 0.12);
  color: var(--pl-warning-ink);
  font-size: 0.8rem;
}
.chat-conexion-banner .spinner-border {
  flex-shrink: 0;
  color: currentColor;
}

.chat-mensajes__estado {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: var(--pl-muted);
  font-size: 0.85rem;
}
.chat-mensajes__vacio {
  min-height: 200px;
}

.chat-opcion-radio {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface);
  cursor: pointer;
  transition: border-color var(--pl-duration-fast) var(--pl-ease-standard), background var(--pl-duration-fast) var(--pl-ease-standard);
}
.chat-opcion-radio:hover {
  border-color: rgba(var(--pl-primary-rgb), 0.4);
}
.chat-opcion-radio--activa {
  border-color: var(--pl-primary);
  background: rgba(var(--pl-primary-rgb), 0.08);
  font-weight: 600;
}
.chat-opcion-radio:focus-within {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}
@media (pointer: coarse) {
  .chat-opcion-radio {
    min-height: 44px;
  }
}

.chat-baneados {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.chat-baneados__fila {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
}
.chat-baneados__meta {
  color: var(--pl-muted);
  font-size: 0.75rem;
}

.chat-miembros-lista {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.chat-miembros-lista__fila {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.4rem 0.35rem;
  border-radius: var(--pl-radius-md);
}
.chat-miembros-lista__fila:hover {
  background: var(--pl-surface-soft);
}

.chat-rol-badge {
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.chat-rol-badge--owner {
  color: var(--pl-warning-ink);
  background: rgba(var(--pl-warning-rgb), 0.18);
}
.chat-rol-badge--admin {
  color: var(--pl-info-ink);
  background: rgba(var(--pl-info-rgb), 0.14);
}
.chat-rol-badge--mod {
  color: var(--pl-success-ink);
  background: rgba(var(--pl-success-rgb), 0.14);
}
.chat-rol-badge--member {
  color: var(--pl-muted);
  background: var(--pl-surface-soft);
  box-shadow: inset 0 0 0 1px var(--pl-border);
}

.chat-lista-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.9rem;
  border-bottom: 1px solid var(--pl-border);
}
.chat-lista-tabs__tab {
  padding: 0.5rem 0.7rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--pl-muted);
  font-size: 0.82rem;
  font-weight: 600;
  transition: color var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard);
}
.chat-lista-tabs__tab:hover {
  color: var(--pl-primary-ink);
}
.chat-lista-tabs__tab.active {
  border-bottom-color: var(--pl-primary);
  color: var(--pl-primary-ink);
}

.chat-canales-lista {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.chat-canal-fila {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--pl-radius-md);
  background: transparent;
  text-align: start;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard);
}
.chat-canal-fila:hover {
  background: var(--pl-surface-soft);
  border-color: var(--pl-border);
}
.chat-canal-fila--activo {
  background: rgba(var(--pl-primary-rgb), 0.08);
  border-color: rgba(var(--pl-primary-rgb), 0.35);
}
.chat-canal-fila__nombre {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
}
.chat-canal-fila__meta {
  display: block;
  overflow: hidden;
  color: var(--pl-muted);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-canal-fila__accion {
  flex-shrink: 0;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  color: var(--pl-success-ink);
  background: rgba(var(--pl-success-rgb), 0.12);
  font-size: 0.75rem;
  font-weight: 700;
}

.chat-canal-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: var(--pl-primary-ink);
  background: rgba(var(--pl-primary-rgb), 0.12);
  font-size: 0.9rem;
  font-weight: 800;
}

.chat-zona-peligro {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(var(--pl-danger-rgb), 0.25);
}
.chat-zona-peligro__titulo {
  color: var(--pl-danger-ink);
  font-size: 0.8rem;
  font-weight: 700;
}

@media (pointer: coarse) {
  .chat-lista-tabs__tab,
  .chat-canal-fila {
    min-height: 44px;
  }
}

/* ---- Pestanas de personaje ---- */

.chat-tabs-bar {
  min-height: 48px;
  overflow-x: auto;
  gap: 2px;
  background: var(--pl-surface);
  border-bottom: 1px solid var(--pl-border);
  scrollbar-width: thin;
}
.chat-tab {
  display: flex;
  align-items: center;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: border-color var(--pl-duration-fast) var(--pl-ease-standard), background var(--pl-duration-fast) var(--pl-ease-standard);
}
.chat-tab:hover {
  background: rgba(var(--pl-primary-rgb), 0.06);
}
.chat-tab.active {
  border-bottom-color: var(--pl-primary);
  background: rgba(var(--pl-primary-rgb), 0.1);
}
.chat-tab.chat-tab-unread {
  background: rgba(var(--pl-warning-rgb), 0.16);
}
.chat-tab.chat-tab-unread:hover {
  background: rgba(var(--pl-warning-rgb), 0.24);
}
.chat-tab__principal {
  min-width: 0;
  color: var(--pl-ink);
  border-radius: var(--pl-radius-sm) var(--pl-radius-sm) 0 0;
  cursor: pointer;
}
.chat-tab__principal:focus-visible,
.chat-tab__cerrar:focus-visible,
.chat-tab-add:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: -2px;
}
.chat-tab__cerrar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--pl-muted);
  font-size: 0.8rem;
  line-height: 1;
}
.chat-tab__cerrar:hover {
  background: rgba(var(--pl-dark-rgb), 0.1);
  color: var(--pl-ink);
}
.chat-tab-add {
  font-size: 1.1rem;
  color: var(--pl-primary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.chat-tab-add:hover {
  background: rgba(var(--pl-primary-rgb), 0.06);
}
.tab-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--pl-surface);
}

/* ---- Barra lateral de canales ---- */

.chat-sidebar {
  width: 300px;
  min-width: 300px;
  height: 100%;
  background: var(--pl-surface-soft);
  border-right: 1px solid var(--pl-border);
}

.chat-sidebar__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.65rem 0.6rem 0.9rem;
  border-bottom: 1px solid var(--pl-border);
}

.chat-sidebar__titulo {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pl-muted);
}

.chat-sidebar__cerrar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--pl-muted);
}
.chat-sidebar__cerrar:hover {
  background: rgba(var(--pl-dark-rgb), 0.08);
  color: var(--pl-ink);
}
.chat-sidebar__cerrar:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}

@media (max-width: 767.98px) {
  .chat-sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    z-index: 1045;
    width: min(320px, 86vw);
    min-width: 0;
    box-shadow: var(--pl-shadow-lg);
  }
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 1044;
  background: rgba(8, 12, 28, 0.45);
}

.sidebar-profile {
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid var(--pl-border);
}

.sidebar-profile__avatar {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  border-radius: 50%;
  cursor: pointer;
}
.sidebar-profile__avatar:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 2px;
}

.sidebar-profile__nombre {
  color: var(--pl-ink);
  cursor: pointer;
}
.sidebar-profile__nombre-texto {
  font-size: 0.95rem;
  font-weight: 600;
}
.sidebar-profile__nombre:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 2px;
  border-radius: var(--pl-radius-sm);
}

.sidebar-lista {
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
}
.sidebar-lista__titulo {
  margin: 0;
  padding: 0.6rem 0.9rem 0.2rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pl-muted);
}
.sidebar-acciones {
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--pl-border);
}

.sidebar-channels {
  min-height: 0;
}

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--pl-surface-soft);
}

.dropdown-estado {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.1rem;
  padding: 0.1rem 0.35rem 0.1rem 0;
  border: 0;
  background: transparent;
  color: var(--pl-muted);
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: var(--pl-radius-sm);
}
.dropdown-estado:hover {
  color: var(--pl-ink);
}
.dropdown-estado:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}

.estado-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1050;
  min-width: 168px;
  padding: 0.3rem;
  overflow: hidden;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-lg);
}
.dropdown-item-estado {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 0;
  border-radius: var(--pl-radius-sm);
  background: none;
  color: var(--pl-ink);
  font-size: 0.82rem;
  text-align: left;
  cursor: pointer;
}
.dropdown-item-estado:hover {
  background: rgba(var(--pl-primary-rgb), 0.08);
}
.dropdown-item-estado[aria-checked='true'] {
  background: rgba(var(--pl-primary-rgb), 0.12);
  font-weight: 600;
}
.dropdown-item-estado:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: -2px;
}

.channel-item {
  padding: 0.5rem 0.9rem;
  border: 0;
  background: transparent;
  color: var(--pl-ink);
  text-align: left;
  cursor: pointer;
  box-shadow: inset 3px 0 0 transparent;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), box-shadow var(--pl-duration-fast) var(--pl-ease-standard);
}
.channel-item:hover {
  background: rgba(var(--pl-primary-rgb), 0.06);
}
.channel-item:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: -2px;
}
.channel-item.active {
  background: rgba(var(--pl-primary-rgb), 0.12);
  box-shadow: inset 3px 0 0 var(--pl-primary);
}
.channel-item.channel-unread {
  background: rgba(var(--pl-warning-rgb), 0.14);
}
.channel-item.channel-unread:hover {
  background: rgba(var(--pl-warning-rgb), 0.22);
}
.channel-item.channel-mentioned {
  box-shadow: inset 3px 0 0 var(--pl-danger-strong);
}
.channel-item-wrap {
  position: relative;
}
.sidebar-pm .channel-item {
  padding-inline-end: 2.1rem;
}
.channel-item__nombre {
  font-size: 0.875rem;
  font-weight: 600;
}
.channel-item__meta {
  font-size: 0.75rem;
  color: var(--pl-muted);
}

.conversation-close-btn {
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--pl-muted);
  opacity: 0;
  z-index: 2;
  transition: opacity var(--pl-duration-fast) var(--pl-ease-standard), background var(--pl-duration-fast) var(--pl-ease-standard);
}
.channel-item-wrap:hover .conversation-close-btn,
.conversation-close-btn:focus-visible {
  opacity: 1;
}
.conversation-close-btn:hover {
  background: rgba(var(--pl-dark-rgb), 0.1);
  color: var(--pl-ink);
}
.conversation-close-btn:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}
@media (hover: none) {
  .conversation-close-btn {
    opacity: 1;
  }
}
@media (pointer: coarse) {
  .conversation-close-btn {
    width: 40px;
    height: 40px;
  }
}
.sidebar-pm .channel-item-wrap:hover .unread-dot {
  display: none;
}
.unread-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--pl-danger-strong);
  border: 2px solid var(--pl-surface-soft);
}
.unread-count {
  padding: 1px 5px;
  border-radius: 8px;
  background: var(--pl-danger-strong);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
}

/* ---- Cabecera del canal ---- */

.chat-main {
  min-width: 0;
}

.chat-header {
  min-height: 56px;
  background: var(--pl-surface);
}
.chat-header__titulo {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--pl-ink);
}
.chat-header__meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--pl-muted);
}
.chat-header__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--pl-radius-md);
  background: transparent;
  color: var(--pl-muted);
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard);
}
.chat-header__btn:hover {
  background: rgba(var(--pl-primary-rgb), 0.1);
  color: var(--pl-primary-ink);
}
.chat-header__btn:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}
.chat-header__btn[aria-expanded='true'] {
  background: rgba(var(--pl-primary-rgb), 0.14);
  color: var(--pl-primary-ink);
}
.chat-header__btn--peligro:hover {
  background: rgba(var(--pl-danger-rgb), 0.12);
  color: var(--pl-danger-ink);
}
@media (pointer: coarse) {
  .chat-header__btn {
    width: 40px;
    height: 40px;
  }
}

.chat-acciones-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 1050;
  min-width: 210px;
  padding: 0.3rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-lg);
}
.chat-acciones-menu__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.6rem;
  border: 0;
  border-radius: var(--pl-radius-sm);
  background: transparent;
  color: var(--pl-ink);
  font-size: 0.85rem;
  text-align: left;
}
.chat-acciones-menu__item:hover {
  background: rgba(var(--pl-primary-rgb), 0.08);
}
.chat-acciones-menu__item:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: -2px;
}
.chat-acciones-menu__item--peligro {
  color: var(--pl-danger-ink);
}
.chat-acciones-menu__item--peligro:hover {
  background: rgba(var(--pl-danger-rgb), 0.1);
}

.chat-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 100%;
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--pl-muted);
}
.chat-vacio__titulo {
  margin: 0.85rem 0 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--pl-ink);
}
.chat-vacio__texto {
  max-width: 36ch;
  margin: 0 0 1rem;
  font-size: 0.9rem;
}

.busqueda-panel { top: 56px; }
.busqueda-resultados { max-height: 320px; }
.busqueda-resultado:hover { background: rgba(var(--pl-primary-rgb), 0.07); }
.busqueda-resultado + .busqueda-resultado { border-top: 1px solid var(--pl-border); }

.chat-mensajes { background: var(--pl-surface); }
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
.fade-enter-active, .fade-leave-active { transition: opacity var(--pl-duration-base) var(--pl-ease-standard); }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.miembros-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pl-primary-ink);
  font-size: inherit;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
  cursor: pointer;
}
.miembros-link:hover {
  text-decoration: underline;
}
.miembros-link:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 2px;
  border-radius: 3px;
}

.modal-backdrop-custom {
  z-index: 1050;
}
.modal-content-custom {
  max-width: 520px;
  max-height: 80vh;
}
.perfil-modal-full {
  align-items: stretch;
  padding: 1rem;
}
.perfil-modal-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1100px;
  max-height: calc(100vh - 2rem);
  margin: 0 auto;
  overflow: hidden;
  border-radius: var(--pl-radius-lg);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-lg);
}
.min-w-0 { min-width: 0; }
.min-h-0 { min-height: 0; }

.chat-right-sidebar {
  width: 240px;
  min-width: 240px;
  height: 100%;
  overflow: hidden;
  background: var(--pl-surface-soft);
}

.chat-right-sidebar__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid var(--pl-border);
}

.chat-right-sidebar__estado {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 1.5rem 0.9rem;
  color: var(--pl-muted);
  font-size: 0.82rem;
  text-align: center;
}

.miembros-panel {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0.35rem;
  overflow-y: auto;
  list-style: none;
}

.miembro-fila {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  border-radius: var(--pl-radius-md);
}
.miembro-fila:hover {
  background: rgba(var(--pl-primary-rgb), 0.06);
}

.miembro-fila__perfil {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: 1 1 auto;
  min-width: 0;
  padding: 0.4rem 0.35rem;
  border: 0;
  border-radius: var(--pl-radius-md);
  background: transparent;
  color: var(--pl-ink);
  text-align: left;
  cursor: pointer;
}
.miembro-fila__perfil:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: -2px;
}
.miembro-fila__avatar {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.miembro-fila__nombre {
  font-size: 0.82rem;
}
.miembro-fila__rol {
  flex-shrink: 0;
  font-size: 0.78rem;
}
.miembro-fila__rol--owner {
  color: var(--pl-warning-strong);
}
.miembro-fila__rol--mod {
  color: var(--pl-success-ink);
}
.miembro-fila__silencio {
  flex-shrink: 0;
  color: var(--pl-danger-ink);
  font-size: 0.78rem;
}

.miembro-fila__acciones {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--pl-muted);
  opacity: 0;
  transition: opacity var(--pl-duration-fast) var(--pl-ease-standard), background var(--pl-duration-fast) var(--pl-ease-standard);
}
.miembro-fila:hover .miembro-fila__acciones,
.miembro-fila__acciones:focus-visible,
.miembro-fila__acciones[aria-expanded='true'] {
  opacity: 1;
}
.miembro-fila__acciones:hover {
  background: rgba(var(--pl-dark-rgb), 0.1);
  color: var(--pl-ink);
}
.miembro-fila__acciones:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}
@media (hover: none) {
  .miembro-fila__acciones {
    opacity: 1;
  }
}
@media (pointer: coarse) {
  .miembro-fila__perfil {
    min-height: 44px;
  }
  .miembro-fila__acciones {
    width: 40px;
    height: 40px;
  }
}

.chat-right-sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 1044;
  background: rgba(8, 12, 28, 0.45);
}

@media (max-width: 991.98px) {
  .chat-right-sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    z-index: 1045;
    width: min(320px, 86vw);
    min-width: 0;
    box-shadow: var(--pl-shadow-lg);
  }
}

@media (min-width: 992px) {
  .chat-right-sidebar {
    border-left: 1px solid var(--pl-border);
  }
}

.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border: 2px solid var(--pl-surface);
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
  min-width: 210px;
  padding: 0.3rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-lg);
}
.context-menu-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.5rem 0.7rem;
  border: 0;
  border-radius: var(--pl-radius-sm);
  background: none;
  color: var(--pl-ink);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
}
.context-menu-item:hover { background: rgba(var(--pl-primary-rgb), 0.08); }
.context-menu-item:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: -2px;
}
.context-menu-item--peligro {
  color: var(--pl-danger-ink);
}
.context-menu-item--peligro:hover {
  background: rgba(var(--pl-danger-rgb), 0.1);
}
.context-menu-divider {
  height: 1px;
  margin: 0.25rem 0;
  background: var(--pl-border);
}

.channel-mentioned {
  background: rgba(var(--pl-warning-rgb), 0.14) !important;
}
.mention-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--pl-danger-strong);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

@media (pointer: coarse) {
  .chat-tab__principal {
    min-height: 44px;
  }
  .chat-tab__cerrar {
    width: 32px;
    height: 32px;
  }
  .chat-tab-add {
    min-width: 44px;
    min-height: 44px;
  }
  .dropdown-estado {
    min-height: 32px;
    padding-inline: 0.4rem;
  }
  .dropdown-item-estado {
    min-height: 44px;
  }
  .context-menu-item {
    min-height: 44px;
  }
}
</style>

import { Client, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { ref, type Ref } from 'vue'

type MessageCallback = (payload: any) => void
type SesionId = number | string

interface SubscriptionDescriptor {
  key: string
  destination: string
  callback: MessageCallback
}

interface ConnectionEntry {
  client: Client
  token: string
  connected: Ref<boolean>
  subscriptions: Map<string, StompSubscription>
  descriptors: Map<string, SubscriptionDescriptor>
  connecting: Promise<void> | null
}

/**
 * Cada personaje con sesion iniciada tiene su propia conexion STOMP. El
 * backend fija el personaje en el handshake (token de la URL), asi que reciclar
 * un cliente con otro token hacia que los mensajes llegaran al personaje
 * equivocado. Ademas guardamos las suscripciones para repetirlas tras una
 * reconexion automatica: stompjs no las restaura por su cuenta.
 */
const connections = new Map<string, ConnectionEntry>()
const alwaysDisconnected = ref(false)

function clave(sesionId: SesionId): string {
  return String(sesionId)
}

function getBaseUrl(): string {
  return import.meta.env.VITE_API_URL || '/api'
}

function getEntry(sesionId: SesionId): ConnectionEntry | undefined {
  return connections.get(clave(sesionId))
}

function connectedTo(sesionId: SesionId | null | undefined): Ref<boolean> {
  if (sesionId == null) return alwaysDisconnected
  return getEntry(sesionId)?.connected ?? alwaysDisconnected
}

function isConnected(sesionId: SesionId | null | undefined): boolean {
  return connectedTo(sesionId).value
}

function connect(sesionId: SesionId, token: string): Promise<void> {
  const key = clave(sesionId)
  const existing = connections.get(key)

  if (existing) {
    if (existing.token !== token) {
      // Mismo idSesion pero token renovado: cerramos la conexion anterior.
      return disconnect(sesionId).then(() => connect(sesionId, token))
    }
    if (existing.connected.value) return Promise.resolve()
    if (existing.connecting) return existing.connecting
    // Un intento anterior fallo: su cliente sigue reintentando en segundo
    // plano con el mismo token. Lo cerramos antes de crear uno nuevo.
    return disconnect(sesionId).then(() => connect(sesionId, token))
  }

  const entry: ConnectionEntry = {
    client: null as unknown as Client,
    token,
    connected: ref(false),
    subscriptions: new Map(),
    descriptors: new Map(),
    connecting: null,
  }

  entry.connecting = new Promise<void>((resolve, reject) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${getBaseUrl()}/ws?token=${token}`),
      connectHeaders: {},
      debug: () => {},
      reconnectDelay: 5000,
      onConnect: () => {
        entry.connected.value = true
        entry.subscriptions.clear()
        entry.descriptors.forEach((descriptor) => {
          entry.subscriptions.set(
            descriptor.key,
            client.subscribe(descriptor.destination, (message) => {
              descriptor.callback(JSON.parse(message.body))
            })
          )
        })
        entry.connecting = null
        resolve()
      },
      onStompError: (frame) => {
        entry.connected.value = false
        entry.connecting = null
        reject(new Error(frame.headers['message'] || 'Error de WebSocket'))
      },
      onWebSocketClose: () => {
        entry.connected.value = false
        entry.subscriptions.clear()
      },
    })
    entry.client = client
    connections.set(key, entry)
    client.activate()
  })

  return entry.connecting
}

async function disconnect(sesionId: SesionId): Promise<void> {
  const key = clave(sesionId)
  const entry = connections.get(key)
  if (!entry) return
  connections.delete(key)
  entry.subscriptions.clear()
  entry.descriptors.clear()
  entry.connected.value = false
  entry.connecting = null
  try {
    await entry.client.deactivate()
  } catch {}
}

function register(
  sesionId: SesionId,
  key: string,
  destination: string,
  callback: MessageCallback
): string {
  const entry = getEntry(sesionId)
  if (!entry) return key
  const descriptor: SubscriptionDescriptor = { key, destination, callback }
  entry.descriptors.set(key, descriptor)
  if (entry.connected.value) {
    entry.subscriptions.set(
      key,
      entry.client.subscribe(destination, (message) => callback(JSON.parse(message.body)))
    )
  }
  return key
}

function subscribeToChannel(sesionId: SesionId, channelId: number, callback: MessageCallback): string {
  return register(sesionId, `channel-${channelId}`, `/topic/canal.${channelId}`, callback)
}

function subscribeToChannelPresence(
  sesionId: SesionId,
  channelId: number,
  callback: MessageCallback
): string {
  return register(
    sesionId,
    `channel-presence-${channelId}`,
    `/topic/canal.${channelId}.presence`,
    callback
  )
}

function subscribeToPrivateMessages(
  sesionId: SesionId,
  characterId: number,
  callback: MessageCallback
): string {
  return register(sesionId, `privado-${characterId}`, `/topic/privado.${characterId}`, callback)
}

function subscribeToPresence(sesionId: SesionId, callback: MessageCallback): string {
  return register(sesionId, 'presencia-global', '/topic/presencia', callback)
}

function unsubscribe(sesionId: SesionId, key: string) {
  const entry = getEntry(sesionId)
  if (!entry) return
  const sub = entry.subscriptions.get(key)
  if (sub) {
    try { sub.unsubscribe() } catch {}
    entry.subscriptions.delete(key)
  }
  entry.descriptors.delete(key)
}

function sendChannelMessage(
  sesionId: SesionId,
  channelId: number,
  contenido: string,
  mensajePadreId?: number | null
) {
  const entry = getEntry(sesionId)
  if (!entry?.connected.value) return
  const body: Record<string, unknown> = { contenido }
  if (mensajePadreId != null) body.mensajePadreId = mensajePadreId
  entry.client.publish({
    destination: `/app/chat.canal.${channelId}.enviar`,
    body: JSON.stringify(body),
  })
}

function sendPrivateMessage(sesionId: SesionId, receptorId: number, contenido: string) {
  const entry = getEntry(sesionId)
  if (!entry?.connected.value) return
  entry.client.publish({
    destination: '/app/chat.privado.enviar',
    body: JSON.stringify({ receptorId, contenido }),
  })
}

export const websocketService = {
  connectedTo,
  isConnected,
  connect,
  disconnect,
  subscribeToChannel,
  subscribeToChannelPresence,
  subscribeToPrivateMessages,
  subscribeToPresence,
  unsubscribe,
  sendChannelMessage,
  sendPrivateMessage,
}

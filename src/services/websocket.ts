import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { ref } from 'vue'

type MessageCallback = (payload: any) => void

const connected = ref(false)
let client: Client | null = null
const subscriptions = new Map<string, any>()

function getBaseUrl(): string {
  return import.meta.env.VITE_API_URL || '/api'
}

function connect(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (client?.connected) {
      resolve()
      return
    }

    client = new Client({
      webSocketFactory: () => new SockJS(`${getBaseUrl()}/ws?token=${token}`),
      connectHeaders: {},
      debug: () => {},
      reconnectDelay: 5000,
      onConnect: () => {
        connected.value = true
        resolve()
      },
      onStompError: (frame) => {
        connected.value = false
        reject(new Error(frame.headers['message']))
      },
      onWebSocketClose: () => {
        connected.value = false
      },
    })

    client.activate()
  })
}

function disconnect() {
  if (client) {
    subscriptions.forEach((sub) => {
      try { sub.unsubscribe() } catch {}
    })
    subscriptions.clear()
    client.deactivate()
    client = null
    connected.value = false
  }
}

function subscribeToChannel(channelId: number, callback: MessageCallback): string {
  const key = `channel-${channelId}`
  if (!client?.connected) return key

  const sub = client.subscribe(`/topic/canal.${channelId}`, (message) => {
    callback(JSON.parse(message.body))
  })
  subscriptions.set(key, sub)
  return key
}

function subscribeToChannelPresence(channelId: number, callback: MessageCallback): string {
  const key = `channel-presence-${channelId}`
  if (!client?.connected) return key

  const sub = client.subscribe(`/topic/canal.${channelId}.presence`, (message) => {
    callback(JSON.parse(message.body))
  })
  subscriptions.set(key, sub)
  return key
}

function subscribeToPrivateMessages(characterId: number, callback: MessageCallback): string {
  const key = `privado-${characterId}`
  if (!client?.connected) return key

  const sub = client.subscribe(`/user/${characterId}/queue/privado`, (message) => {
    callback(JSON.parse(message.body))
  })
  subscriptions.set(key, sub)
  return key
}

function subscribeToPresence(callback: MessageCallback): string {
  const key = 'presencia-global'
  if (!client?.connected) return key

  const sub = client.subscribe('/topic/presencia', (message) => {
    callback(JSON.parse(message.body))
  })
  subscriptions.set(key, sub)
  return key
}

function unsubscribe(key: string) {
  const sub = subscriptions.get(key)
  if (sub) {
    try { sub.unsubscribe() } catch {}
    subscriptions.delete(key)
  }
}

function sendChannelMessage(channelId: number, contenido: string) {
  if (!client?.connected) return
  client.publish({
    destination: `/app/chat.canal.${channelId}.enviar`,
    body: JSON.stringify({ contenido }),
  })
}

function sendPrivateMessage(receptorId: number, contenido: string) {
  if (!client?.connected) return
  client.publish({
    destination: '/app/chat.privado.enviar',
    body: JSON.stringify({ receptorId, contenido }),
  })
}

export const websocketService = {
  connected,
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

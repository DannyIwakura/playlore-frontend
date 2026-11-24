import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { websocketService } from './websocket'

const clients: any[] = []
const socketUrls: string[] = []

vi.mock('sockjs-client', () => ({
  default: vi.fn(function (url: string) {
    socketUrls.push(url)
    return {} as any
  }),
}))

vi.mock('@stomp/stompjs', () => ({
  Client: class {
    options: any
    active = false
    published: any[] = []
    subscribeCalls: string[] = []
    private subscriptionCount = 0

    constructor(options: any) {
      this.options = options
      clients.push(this)
    }

    activate() {
      this.active = true
      this.options.webSocketFactory?.()
      void Promise.resolve().then(() => this.options.onConnect?.())
    }

    deactivate() {
      this.active = false
      this.options.onWebSocketClose?.()
      return Promise.resolve()
    }

    subscribe(destino: string, _callback: (message: { body: string }) => void) {
      this.subscribeCalls.push(destino)
      const sub = {
        id: `sub-${this.subscriptionCount++}`,
        unsubscribe: vi.fn(),
      }
      return sub as any
    }

    publish(frame: any) {
      this.published.push(frame)
    }
  },
}))

function ultimoClient() {
  return clients[clients.length - 1]
}

describe('websocketService (multi-sesión)', () => {
  beforeEach(() => {
    clients.length = 0
    socketUrls.length = 0
    vi.clearAllMocks()
  })

  afterEach(async () => {
    for (const id of [1, 2, 3]) await websocketService.disconnect(id)
  })

  it('mantiene dos sesiones conectadas a la vez con su propio token', async () => {
    await websocketService.connect(1, 'token-uno')
    await websocketService.connect(2, 'token-dos')

    expect(websocketService.isConnected(1)).toBe(true)
    expect(websocketService.isConnected(2)).toBe(true)
    expect(socketUrls).toEqual([
      '/api/ws?token=token-uno',
      '/api/ws?token=token-dos',
    ])
  })

  it('desconectar una sesión no afecta a la otra', async () => {
    await websocketService.connect(1, 'token-uno')
    await websocketService.connect(2, 'token-dos')

    const clienteUno = clients[0]
    await websocketService.disconnect(1)

    expect(websocketService.isConnected(1)).toBe(false)
    expect(websocketService.isConnected(2)).toBe(true)
    expect(clienteUno.active).toBe(false)
    expect(clients[1].active).toBe(true)
  })

  it('aísla las suscripciones de cada sesión', async () => {
    await websocketService.connect(1, 'token-uno')
    await websocketService.connect(2, 'token-dos')
    websocketService.subscribeToPrivateMessages(1, 10, vi.fn())
    websocketService.subscribeToPrivateMessages(2, 20, vi.fn())

    expect(clients[0].subscribeCalls).toEqual(['/topic/privado.10'])
    expect(clients[1].subscribeCalls).toEqual(['/topic/privado.20'])

    websocketService.unsubscribe(1, 'privado-10')
    await websocketService.disconnect(1)

    expect(websocketService.isConnected(2)).toBe(true)
    expect(clients[1].subscribeCalls).toEqual(['/topic/privado.20'])
  })

  it('recrea las suscripciones tras una reconexión automática', async () => {
    await websocketService.connect(1, 'token-uno')
    websocketService.subscribeToChannel(1, 5, vi.fn())
    expect(ultimoClient().subscribeCalls).toEqual(['/topic/canal.5'])

    ultimoClient().options.onWebSocketClose()
    expect(websocketService.isConnected(1)).toBe(false)

    ultimoClient().options.onConnect()
    expect(websocketService.isConnected(1)).toBe(true)
    expect(ultimoClient().subscribeCalls).toEqual(['/topic/canal.5', '/topic/canal.5'])
  })

  it('publica cada mensaje por la conexión de su sesión', async () => {
    await websocketService.connect(1, 'token-uno')
    await websocketService.connect(2, 'token-dos')

    websocketService.sendChannelMessage(2, 8, 'hola')
    websocketService.sendPrivateMessage(1, 20, 'privado')

    expect(clients[0].published[0].destination).toBe('/app/chat.privado.enviar')
    expect(clients[1].published[0].destination).toBe('/app/chat.canal.8.enviar')
    expect(websocketService.connectedTo(null).value).toBe(false)
  })
})

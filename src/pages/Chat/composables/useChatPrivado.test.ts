import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useChatPrivado } from './useChatPrivado'
import { characterSessionStore } from '../../../store/characterSessionStore'
import { chatApi } from '../../../services/chatApi'
import { websocketService } from '../../../services/websocket'

vi.mock('../../../services/chatApi', () => ({
  chatApi: {
    obtenerConversaciones: vi.fn(),
    obtenerConversacion: vi.fn(),
    cerrarConversacion: vi.fn(),
  },
}))

vi.mock('../../../services/websocket', () => ({
  websocketService: {
    sendPrivateMessage: vi.fn(),
  },
}))

function sesionEnLocal(personajeId: number) {
  characterSessionStore.sesiones.value = [
    {
      idSesion: 1,
      personajeId,
      personajeNombre: 'Hero',
      personajeAvatar: '',
      usuarioId: 1,
      tokenJwt: 'token',
      fechaInicio: '',
      ultimaActividad: '',
    },
  ]
  characterSessionStore.sesionActualIdx.value = 0
}

function setup() {
  const canalActivo = ref<any>({ id: 5 })
  const conversacionActiva = ref<any>(null)
  const scrollAlFinal = vi.fn()
  const cerrarContextMenu = vi.fn()
  const ctx = useChatPrivado({ canalActivo, conversacionActiva, scrollAlFinal, cerrarContextMenu })
  return { ctx, canalActivo, conversacionActiva, scrollAlFinal, cerrarContextMenu }
}

describe('useChatPrivado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sesionEnLocal(7)
  })

  afterEach(() => {
    characterSessionStore.sesiones.value = []
    characterSessionStore.sesionActualIdx.value = 0
  })

  describe('cargarConversaciones', () => {
    it('agrupa por interlocutor y cuenta no leídos de los recibidos', async () => {
      const { ctx } = setup()
      ;(chatApi.obtenerConversaciones as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          convMsg({ emisorId: 2, receptorId: 7, emisorNombre: 'Ana', leido: false }),
          convMsg({ emisorId: 2, receptorId: 7, emisorNombre: 'Ana', leido: true }),
          convMsg({ emisorId: 7, receptorId: 3, receptorNombre: 'Bob' }),
        ],
      })

      await ctx.cargarConversaciones()

      expect(ctx.conversacionesPrivadas.value).toHaveLength(2)
      const conAna = ctx.conversacionesPrivadas.value.find(c => c.personajeId === 2)
      const conBob = ctx.conversacionesPrivadas.value.find(c => c.personajeId === 3)
      expect(conAna?.personajeNombre).toBe('Ana')
      expect(conAna?.noLeidos).toBe(1)
      expect(conBob?.noLeidos).toBe(0)
      expect(ctx.noLeidosPriv.value.get(2)).toBe(1)
    })

    it('deja la lista vacía si la API falla', async () => {
      const { ctx } = setup()
      ;(chatApi.obtenerConversaciones as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('x'))
      await ctx.cargarConversaciones()
      expect(ctx.conversacionesPrivadas.value).toEqual([])
    })

    it('carga conversaciones de otra sesión sin tocar los refs visibles', async () => {
      const { ctx } = setup()
      ;(chatApi.obtenerConversaciones as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [convMsg({ emisorId: 9, receptorId: 4, emisorNombre: 'Luna', leido: false })],
      })

      const resultado = await ctx.cargarConversaciones('otro-token', 4)

      expect(chatApi.obtenerConversaciones).toHaveBeenCalledWith('otro-token')
      expect(resultado.conversaciones[0].personajeId).toBe(9)
      expect(resultado.noLeidos.get(9)).toBe(1)
      expect(ctx.conversacionesPrivadas.value).toEqual([])
      expect(ctx.noLeidosPriv.value.size).toBe(0)
    })
  })

  describe('seleccionarConversacion', () => {
    it('cierra el canal activo, carga el historial y resetea los no leídos', async () => {
      const { ctx, canalActivo, conversacionActiva } = setup()
      const conv = { personajeId: 2, personajeNombre: 'Ana', noLeidos: 5 }
      ;(chatApi.obtenerConversacion as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [convMsg({ emisorId: 2, receptorId: 7 })],
      })

      await ctx.seleccionarConversacion(conv)

      expect(canalActivo.value).toBeNull()
      expect(conversacionActiva.value).toEqual(conv)
      expect(chatApi.obtenerConversacion).toHaveBeenCalledWith(2, 'token')
      expect(ctx.mensajesPrivados.value).toHaveLength(1)
      expect(ctx.noLeidosPriv.value.get(2)).toBe(0)
      expect(ctx.cargandoPriv.value).toBe(false)
    })

    it('abrirConversacionPrivada crea la conversación si no existía', async () => {
      const { ctx, cerrarContextMenu } = setup()
      ;(chatApi.obtenerConversacion as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] })

      await ctx.abrirConversacionPrivada(9, 'Luna', 'avatar9')

      expect(cerrarContextMenu).toHaveBeenCalled()
      expect(ctx.conversacionesPrivadas.value[0].personajeId).toBe(9)
      expect(ctx.conversacionesPrivadas.value[0].personajeNombre).toBe('Luna')
    })
  })

  describe('enviarMensajePrivadoWs', () => {
    it('añade mensaje temporal, envía por WS y actualiza la conversación', async () => {
      const { ctx, conversacionActiva } = setup()
      const conv = { personajeId: 3, personajeNombre: 'Bob' }
      ctx.conversacionesPrivadas.value = [conv]
      conversacionActiva.value = conv

      ctx.enviarMensajePrivadoWs('hola bob')

      expect(ctx.mensajesPrivados.value).toHaveLength(1)
      expect(ctx.mensajesPrivados.value[0].contenido).toBe('hola bob')
      expect(ctx.mensajesPrivados.value[0].esMio).toBe(true)
      expect(websocketService.sendPrivateMessage).toHaveBeenCalledWith(1, 3, 'hola bob')
      const convActualizado = ctx.conversacionesPrivadas.value.find(c => c.personajeId === 3)
      expect(convActualizado?.ultimoMensaje).toBe('hola bob')
    })

    it('no marca no leídos al enviar: los pone la conexión WS del receptor', async () => {
      const { ctx, conversacionActiva } = setup()
      conversacionActiva.value = { personajeId: 7, personajeNombre: 'Hero' }

      ctx.enviarMensajePrivadoWs('hola')

      expect(ctx.noLeidosCharacter.value.get(7)).toBeUndefined()
      expect(websocketService.sendPrivateMessage).toHaveBeenCalledWith(1, 7, 'hola')
    })

    it('ignora texto vacío o sin conversación activa', () => {
      const { ctx } = setup()
      ctx.enviarMensajePrivadoWs('')
      expect(websocketService.sendPrivateMessage).not.toHaveBeenCalled()
    })
  })

  describe('cerrar conversaciones', () => {
    it('la oculta de la lista sin borrar sus mensajes', async () => {
      const { ctx, conversacionActiva } = setup()
      const conv = { personajeId: 2, personajeNombre: 'Ana', noLeidos: 1 }
      ctx.conversacionesPrivadas.value = [conv]
      ctx.noLeidosPriv.value = new Map([[2, 1]])
      conversacionActiva.value = conv
      ;(chatApi.cerrarConversacion as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.cerrarConversacionDeLista(conv)

      expect(chatApi.cerrarConversacion).toHaveBeenCalledWith(2)
      expect(ctx.conversacionesPrivadas.value).toEqual([])
      expect(ctx.noLeidosPriv.value.has(2)).toBe(false)
      expect(ctx.mensajesPrivados.value).toEqual([])
    })

    it('no cierra la conversación si la API falla', async () => {
      const { ctx } = setup()
      const conv = { personajeId: 2, personajeNombre: 'Ana' }
      ctx.conversacionesPrivadas.value = [conv]
      ;(chatApi.cerrarConversacion as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('x'))

      await ctx.cerrarConversacionDeLista(conv)

      expect(ctx.conversacionesPrivadas.value).toEqual([conv])
    })
  })
})

function convMsg(overrides: Record<string, unknown> = {}) {
  return {
    emisorId: 7,
    receptorId: 2,
    emisorNombre: 'Hero',
    receptorNombre: 'Ana',
    emisorAvatar: 'a',
    receptorAvatar: 'b',
    contenido: 'hola',
    fechaEnvio: new Date().toISOString(),
    leido: false,
    ...overrides,
  }
}

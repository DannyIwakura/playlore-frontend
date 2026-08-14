import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useChatMensajes } from './useChatMensajes'
import { characterSessionStore } from '../../../store/characterSessionStore'
import { chatApi } from '../../../services/chatApi'
import { websocketService } from '../../../services/websocket'
import { copiarTexto } from '../chatUtils'

vi.mock('../../../services/chatApi', () => ({
  chatApi: {
    obtenerMensajesCanal: vi.fn(),
    enviarMensajeCanal: vi.fn(),
    editarMensajeCanal: vi.fn(),
    eliminarMensajeCanal: vi.fn(),
  },
}))

vi.mock('../../../services/websocket', () => ({
  websocketService: {
    connected: { value: false },
    sendChannelMessage: vi.fn(),
  },
}))

vi.mock('../chatUtils', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../chatUtils')>()
  return { ...mod, copiarTexto: vi.fn() }
})

function sesionConToken() {
  characterSessionStore.sesiones.value = [
    {
      idSesion: 1,
      personajeId: 10,
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
  const canalActivo = ref<any>({ id: 5, miRol: 'OWNER' })
  const channelLastSeenIds = ref<Record<number, number>>({})
  const channelMentionedMap = ref<Map<number, boolean>>(new Map())
  const chatEditorRef = ref<{ enfocar?: () => void; setContenido?: (t: string) => void; limpiar?: () => void } | null>(null)
  const verPerfil = vi.fn()
  const ctx = useChatMensajes({
    canalActivo,
    PAGE_SIZE: 50,
    channelLastSeenIds,
    channelMentionedMap,
    chatEditorRef,
    verPerfil,
  })
  return { ctx, canalActivo, channelMentionedMap, chatEditorRef, verPerfil }
}

describe('useChatMensajes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sesionConToken()
    ;(websocketService as any).connected.value = false
  })

  afterEach(() => {
    characterSessionStore.sesiones.value = []
    characterSessionStore.sesionActualIdx.value = 0
  })

  describe('cargarMensajesAntiguos', () => {
    it('carga la página siguiente y antepone los mensajes', async () => {
      const { ctx } = setup()
      ;(chatApi.obtenerMensajesCanal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { content: [msg(2), msg(3)], last: false },
      })

      await ctx.cargarMensajesAntiguos()

      expect(chatApi.obtenerMensajesCanal).toHaveBeenCalledWith(5, 1, 50)
      expect(ctx.mensajes.value.map(m => m.id)).toEqual([2, 3])
      expect(ctx.hayMasMensajes.value).toBe(true)
      expect(ctx.pagina.value).toBe(1)
    })

    it('marca fin de historial si la página viene vacía', async () => {
      const { ctx } = setup()
      ;(chatApi.obtenerMensajesCanal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { content: [], last: true },
      })
      await ctx.cargarMensajesAntiguos()
      expect(ctx.hayMasMensajes.value).toBe(false)
      expect(ctx.pagina.value).toBe(0)
    })

    it('no duplica mensajes ya cargados', async () => {
      const { ctx } = setup()
      ctx.mensajes.value = [msg(2), msg(3)]
      ;(chatApi.obtenerMensajesCanal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { content: [msg(2), msg(3), msg(4)], last: false },
      })
      await ctx.cargarMensajesAntiguos()
      expect(ctx.mensajes.value.map(m => m.id)).toEqual([4, 2, 3])
    })

    it('no hace nada si ya está cargando o sin canal', async () => {
      const { ctx, canalActivo } = setup()
      canalActivo.value = null
      await ctx.cargarMensajesAntiguos()
      expect(chatApi.obtenerMensajesCanal).not.toHaveBeenCalled()
    })
  })

  describe('enviarMensaje', () => {
    it('envía por WebSocket cuando hay conexión y token', async () => {
      const { ctx, channelMentionedMap } = setup()
      ;(websocketService as any).connected.value = true
      ctx.mensajeEnRespuesta.value = msg(99)

      await ctx.enviarMensaje('hola')

      expect(websocketService.sendChannelMessage).toHaveBeenCalledWith(5, 'hola', 99)
      expect(ctx.mensajeEnRespuesta.value).toBeNull()
      expect(ctx.enviando.value).toBe(false)
      expect(channelMentionedMap.value.get(5)).toBe(false)
    })

    it('usa el fallback REST si no hay WebSocket y refresca la lista', async () => {
      const { ctx, channelMentionedMap } = setup()
      ;(chatApi.enviarMensajeCanal as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })
      ;(chatApi.obtenerMensajesCanal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { content: [msg(7)], last: true },
      })

      await ctx.enviarMensaje('hola')

      expect(chatApi.enviarMensajeCanal).toHaveBeenCalledWith(5, 'hola', null)
      expect(chatApi.obtenerMensajesCanal).toHaveBeenCalledWith(5, 0, 50)
      expect(ctx.mensajes.value.map(m => m.id)).toEqual([7])
      expect(channelMentionedMap.value.get(5)).toBe(false)
    })

    it('ignora texto vacío o envío en curso', async () => {
      const { ctx } = setup()
      await ctx.enviarMensaje('   ')
      expect(websocketService.sendChannelMessage).not.toHaveBeenCalled()
      expect(chatApi.enviarMensajeCanal).not.toHaveBeenCalled()
    })
  })

  describe('respuesta y edición', () => {
    it('iniciarRespuesta marca el mensaje padre y enfoca el editor', async () => {
      const { ctx, chatEditorRef } = setup()
      const enfocar = vi.fn()
      chatEditorRef.value = { enfocar }
      ctx.iniciarRespuesta(msg(4))
      expect(ctx.mensajeEnRespuesta.value?.id).toBe(4)
      expect(ctx.modoEdicion.value).toBeNull()
      await Promise.resolve()
      expect(enfocar).toHaveBeenCalled()
    })

    it('iniciarEdicion vuelca el contenido en el editor', async () => {
      const { ctx, chatEditorRef } = setup()
      const setContenido = vi.fn()
      const enfocar = vi.fn()
      chatEditorRef.value = { setContenido, enfocar }
      ctx.iniciarEdicion({ id: 4, contenido: '<p>v1</p>' })
      expect(ctx.modoEdicion.value?.id).toBe(4)
      expect(ctx.mensajeEnRespuesta.value).toBeNull()
      await Promise.resolve()
      expect(setContenido).toHaveBeenCalledWith('<p>v1</p>')
      expect(enfocar).toHaveBeenCalled()
    })

    it('handleSendCanal edita si hay modo edición', async () => {
      const { ctx } = setup()
      ctx.mensajes.value = [msg(9)]
      ctx.modoEdicion.value = ctx.mensajes.value[0]
      ;(chatApi.editarMensajeCanal as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.handleSendCanal('v2')

      expect(chatApi.editarMensajeCanal).toHaveBeenCalledWith(5, 9, 'v2')
      expect(ctx.mensajes.value[0].contenido).toBe('v2')
      expect(ctx.mensajes.value[0].editado).toBe(true)
      expect(ctx.modoEdicion.value).toBeNull()
    })

    it('handleSendCanal envía si no hay modo edición', async () => {
      const { ctx } = setup()
      ;(websocketService as any).connected.value = true
      await ctx.handleSendCanal('nuevo')
      expect(websocketService.sendChannelMessage).toHaveBeenCalledWith(5, 'nuevo', null)
    })
  })

  describe('eliminación', () => {
    it('eliminarMensaje abre la confirmación', () => {
      const { ctx } = setup()
      ctx.eliminarMensaje(9)
      expect(ctx.mensajeAEliminarId.value).toBe(9)
      expect(ctx.mostrarConfirmacionEliminar.value).toBe(true)
    })

    it('ejecutarEliminarMensaje marca el mensaje como eliminado', async () => {
      const { ctx } = setup()
      ctx.mensajes.value = [msg(9)]
      ctx.mensajeAEliminarId.value = 9
      ;(chatApi.eliminarMensajeCanal as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.ejecutarEliminarMensaje()

      expect(chatApi.eliminarMensajeCanal).toHaveBeenCalledWith(5, 9)
      expect(ctx.mensajes.value[0].eliminado).toBe(true)
      expect(ctx.mostrarConfirmacionEliminar.value).toBe(false)
      expect(ctx.mensajeAEliminarId.value).toBeNull()
    })
  })

  describe('esAdminOrOwner', () => {
    it('reconoce roles de moderación', () => {
      const { ctx, canalActivo } = setup()
      expect(ctx.esAdminOrOwner()).toBe(true)
      for (const rol of ['ADMIN', 'MOD', 'OWNER']) {
        canalActivo.value = { id: 5, miRol: rol }
        expect(ctx.esAdminOrOwner()).toBe(true)
      }
      canalActivo.value = { id: 5, miRol: 'MEMBER' }
      expect(ctx.esAdminOrOwner()).toBe(false)
      canalActivo.value = null
      expect(ctx.esAdminOrOwner()).toBe(false)
    })
  })

  describe('handleMentionClick', () => {
    it('navega a perfiles con enlaces profile:<id>', () => {
      const { ctx, verPerfil } = setup()
      const el = document.createElement('div')
      el.innerHTML = '<a href="profile:42">@Hero</a>'
      const a = el.querySelector('a')!
      a.addEventListener('click', (e: Event) => ctx.handleMentionClick(e as MouseEvent))
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(verPerfil).toHaveBeenCalledWith(42)
    })

    it('ignora enlaces externos', () => {
      const { ctx, verPerfil } = setup()
      const el = document.createElement('div')
      el.innerHTML = '<a href="https://x.com">x</a>'
      const a = el.querySelector('a')!
      a.addEventListener('click', (e: Event) => {
        ctx.handleMentionClick(e as MouseEvent)
        e.preventDefault()
      })
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(verPerfil).not.toHaveBeenCalled()
    })
  })

  describe('copiarMensaje', () => {
    it('copia el contenido limpio', () => {
      const { ctx } = setup()
      ctx.copiarMensaje({ contenido: '<p>texto</p>' })
      expect(copiarTexto).toHaveBeenCalledWith('<p>texto</p>')
    })
  })
})

function msg(id: number) {
  return { id, contenido: `msg-${id}`, personajeId: 10, fechaEnvio: new Date().toISOString() }
}

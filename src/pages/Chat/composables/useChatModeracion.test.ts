import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useChatModeracion } from './useChatModeracion'
import { characterSessionStore } from '../../../store/characterSessionStore'
import { chatApi } from '../../../services/chatApi'

vi.mock('../../../services/chatApi', () => ({
  chatApi: {
    cambiarRol: vi.fn(),
    expulsarMiembro: vi.fn(),
    banearMiembro: vi.fn(),
    silenciarMiembro: vi.fn(),
    desilenciarMiembro: vi.fn(),
    listarBaneados: vi.fn(),
    desbanearMiembro: vi.fn(),
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
  const canalActivo = ref<any>({ id: 5, miRol: 'MOD' })
  const contextMenuTarget = ref<any>(null)
  const cargarMiembrosOnline = vi.fn()
  const cerrarContextMenu = vi.fn()
  const aviso = ref<string | null>(null)
  let confirmCb: (() => void) | null = null
  const mostrarConfirmModal = vi.fn((_titulo: string, _texto: string, onConfirm: () => void) => {
    confirmCb = onConfirm
  })
  const ctx = useChatModeracion({
    canalActivo,
    contextMenuTarget,
    cargarMiembrosOnline,
    cerrarContextMenu,
    mostrarConfirmModal,
    aviso,
  })
  return { ctx, canalActivo, contextMenuTarget, cargarMiembrosOnline, cerrarContextMenu, mostrarConfirmModal, aviso, getConfirmCb: () => confirmCb }
}

describe('useChatModeracion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sesionEnLocal(10)
  })

  afterEach(() => {
    characterSessionStore.sesiones.value = []
    characterSessionStore.sesionActualIdx.value = 0
  })

  describe('miRolEnCanal / puedeSilenciarContextMenu', () => {
    it('expone el rol del canal activo', () => {
      const { ctx, canalActivo } = setup()
      expect(ctx.miRolEnCanal.value).toBe('MOD')
      canalActivo.value = { id: 5, miRol: 'OWNER' }
      expect(ctx.miRolEnCanal.value).toBe('OWNER')
    })

    it('permite silenciar a un MEMBER si eres moderador', () => {
      const { ctx, contextMenuTarget } = setup()
      contextMenuTarget.value = { personajeId: 1, rol: 'MEMBER' }
      expect(ctx.puedeSilenciarContextMenu.value).toBe(true)
    })

    it('deniega si no hay objetivo, el objetivo no es MEMBER o eres tú', () => {
      const { ctx, contextMenuTarget } = setup()
      expect(ctx.puedeSilenciarContextMenu.value).toBe(false)
      contextMenuTarget.value = { personajeId: 1, rol: 'ADMIN' }
      expect(ctx.puedeSilenciarContextMenu.value).toBe(false)
      contextMenuTarget.value = { personajeId: 10, rol: 'MEMBER' }
      expect(ctx.puedeSilenciarContextMenu.value).toBe(false)
    })

    it('deniega si el canal activo no es de moderación', () => {
      const { ctx, canalActivo, contextMenuTarget } = setup()
      contextMenuTarget.value = { personajeId: 1, rol: 'MEMBER' }
      canalActivo.value = { id: 5, miRol: 'MEMBER' }
      expect(ctx.puedeSilenciarContextMenu.value).toBe(false)
    })
  })

  describe('ban', () => {
    it('abrirBanModal prepara el objetivo y la duración', () => {
      const { ctx, cerrarContextMenu } = setup()
      ctx.abrirBanModal({ personajeId: 1, personajeNombre: 'Luna' })
      expect(cerrarContextMenu).toHaveBeenCalled()
      expect(ctx.banTarget.value?.personajeId).toBe(1)
      expect(ctx.banDuracion.value).toBe('PERMANENTE')
      expect(ctx.opcionesBan).toHaveLength(4)
    })

    it('confirmarBan llama a la API y refresca miembros', async () => {
      const { ctx, cargarMiembrosOnline } = setup()
      ctx.banTarget.value = { personajeId: 1 }
      ctx.banDuracion.value = '24H'
      ;(chatApi.banearMiembro as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.confirmarBan()

      expect(chatApi.banearMiembro).toHaveBeenCalledWith(5, 1, '24H')
      expect(ctx.banTarget.value).toBeNull()
      expect(cargarMiembrosOnline).toHaveBeenCalled()
    })
  })

  describe('silenciar', () => {
    it('abrirSilenciarModal prepara el objetivo', () => {
      const { ctx, cerrarContextMenu } = setup()
      ctx.abrirSilenciarModal({ personajeId: 1 })
      expect(cerrarContextMenu).toHaveBeenCalled()
      expect(ctx.silenciarTarget.value?.personajeId).toBe(1)
      expect(ctx.silenciarDuracion.value).toBe('1H')
    })

    it('confirmarSilenciar llama a la API', async () => {
      const { ctx, cargarMiembrosOnline } = setup()
      ctx.silenciarTarget.value = { personajeId: 1 }
      ctx.silenciarDuracion.value = '7D'
      ;(chatApi.silenciarMiembro as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.confirmarSilenciar()

      expect(chatApi.silenciarMiembro).toHaveBeenCalledWith(5, 1, '7D')
      expect(ctx.silenciarTarget.value).toBeNull()
      expect(cargarMiembrosOnline).toHaveBeenCalled()
    })

    it('estaSilenciado usa la fecha de expiración', () => {
      const { ctx } = setup()
      expect(ctx.estaSilenciado({ silenciadoHasta: null })).toBe(false)
      expect(ctx.estaSilenciado({ silenciadoHasta: new Date(Date.now() + 3600000).toISOString() })).toBe(true)
      expect(ctx.estaSilenciado({ silenciadoHasta: new Date(Date.now() - 3600000).toISOString() })).toBe(false)
    })
  })

  describe('acciones con confirmación', () => {
    it('expulsarDelCanal ejecuta tras confirmar', async () => {
      const { ctx, cargarMiembrosOnline, getConfirmCb } = setup()
      ;(chatApi.expulsarMiembro as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.expulsarDelCanal({ personajeId: 3, personajeNombre: 'X' })
      const cb = getConfirmCb()
      expect(cb).toBeTruthy()
      await cb!()

      expect(chatApi.expulsarMiembro).toHaveBeenCalledWith(5, 3)
      expect(cargarMiembrosOnline).toHaveBeenCalled()
    })

    it('ascenderAMod cambia el rol a MOD tras confirmar', async () => {
      const { ctx, cargarMiembrosOnline, getConfirmCb } = setup()
      ;(chatApi.cambiarRol as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.ascenderAMod({ personajeId: 3, personajeNombre: 'X' })
      const cb = getConfirmCb()
      expect(cb).toBeTruthy()
      await cb!()

      expect(chatApi.cambiarRol).toHaveBeenCalledWith(5, 3, 'MOD')
      expect(cargarMiembrosOnline).toHaveBeenCalled()
    })

    it('desilenciar llama a la API tras confirmar', async () => {
      const { ctx, getConfirmCb } = setup()
      ;(chatApi.desilenciarMiembro as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.desilenciar({ personajeId: 3, personajeNombre: 'X' })
      const cb = getConfirmCb()
      expect(cb).toBeTruthy()
      await cb!()

      expect(chatApi.desilenciarMiembro).toHaveBeenCalledWith(5, 3)
    })
  })

  describe('baneados', () => {
    it('abrirModalBaneados carga la lista', async () => {
      const { ctx } = setup()
      const baneados = [{ personajeId: 1 }, { personajeId: 2 }]
      ;(chatApi.listarBaneados as ReturnType<typeof vi.fn>).mockResolvedValue({ data: baneados })

      await ctx.abrirModalBaneados()

      expect(chatApi.listarBaneados).toHaveBeenCalledWith(5)
      expect(ctx.mostrarBaneados.value).toBe(true)
      expect(ctx.baneados.value).toEqual(baneados)
      expect(ctx.cargandoBaneados.value).toBe(false)
    })

    it('desbanearPersonaje quita de la lista tras confirmar', async () => {
      const { ctx, getConfirmCb, aviso } = setup()
      ctx.baneados.value = [{ personajeId: 1, personajeNombre: 'Luna' }, { personajeId: 2, personajeNombre: 'Sol' }]
      ;(chatApi.desbanearMiembro as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

      await ctx.desbanearPersonaje({ personajeId: 1, personajeNombre: 'Luna' })
      const cb = getConfirmCb()
      expect(cb).toBeTruthy()
      await cb!()

      expect(chatApi.desbanearMiembro).toHaveBeenCalledWith(5, 1)
      expect(ctx.baneados.value.map(b => b.personajeId)).toEqual([2])
      expect(aviso.value).toBeNull()
    })

    it('desbanearPersonaje avisa si falla', async () => {
      const { ctx, getConfirmCb, aviso } = setup()
      ;(chatApi.desbanearMiembro as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('x'))

      await ctx.desbanearPersonaje({ personajeId: 1, personajeNombre: 'Luna' })
      const cb = getConfirmCb()
      await cb!()

      expect(aviso.value).toBe('Error al desbanear al personaje.')
    })
  })
})

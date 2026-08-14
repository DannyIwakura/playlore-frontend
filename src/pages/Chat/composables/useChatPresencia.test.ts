import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useChatPresencia } from './useChatPresencia'
import { characterSessionStore } from '../../../store/characterSessionStore'
import { chatApi } from '../../../services/chatApi'

vi.mock('../../../services/chatApi', () => ({
  chatApi: {
    actualizarStatus: vi.fn(),
    listarMiembros: vi.fn(),
  },
}))

function usarConSesion(personajeId: number) {
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

describe('useChatPresencia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usarConSesion(10)
  })

  afterEach(() => {
    characterSessionStore.sesiones.value = []
    characterSessionStore.sesionActualIdx.value = 0
  })

  it('estadoActual es "conectado" por defecto', () => {
    const { estadoActual, statusColor } = useChatPresencia({ canalActivo: ref({ id: 5 }) })
    expect(estadoActual.value).toBe('conectado')
    expect(statusColor.value).toBe('#22c55e')
  })

  it('cambiarEstado actualiza el mapa y llama a la API', async () => {
    const canalActivo = ref({ id: 5 })
    const { statusMap, cambiarEstado, mostrarSelectorEstado } = useChatPresencia({ canalActivo })
    mostrarSelectorEstado.value = true
    await cambiarEstado('ocupado')
    expect(statusMap.value.get(10)).toBe('ocupado')
    expect(chatApi.actualizarStatus).toHaveBeenCalledWith(10, 'ocupado')
    expect(mostrarSelectorEstado.value).toBe(false)
  })

  it('no llama a la API sin sesión de personaje', async () => {
    characterSessionStore.sesiones.value = []
    const { cambiarEstado } = useChatPresencia({ canalActivo: ref({ id: 5 }) })
    await cambiarEstado('ausente')
    expect(chatApi.actualizarStatus).not.toHaveBeenCalled()
  })

  it('getTabStatusColor usa gris para offline y el color del estado para online', () => {
    const { onlineMap, statusMap, getTabStatusColor } = useChatPresencia({ canalActivo: ref({ id: 5 }) })
    onlineMap.value = new Map([
      [1, true],
      [2, false],
    ])
    statusMap.value = new Map([[1, 'ocupado']])
    expect(getTabStatusColor(1)).toBe('#ef4444')
    expect(getTabStatusColor(2)).toBe('#9ca3af')
    expect(getTabStatusColor(99)).toBe('#9ca3af')
  })

  it('cargarMiembrosOnline rellena los mapas y ordena por rol (las sesiones locales son online)', async () => {
    const canalActivo = ref({ id: 5 })
    const { miembrosOnline, onlineMap, statusMap, cargandoMiembrosOnline, cargarMiembrosOnline } =
      useChatPresencia({ canalActivo })

    ;(chatApi.listarMiembros as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        content: [
          { personajeId: 1, rol: 'MEMBER', online: true, status: 'ausente' },
          { personajeId: 2, rol: 'OWNER', online: true, status: null },
          { personajeId: 10, rol: 'MOD', online: false, status: null },
        ],
      },
    })

    await cargarMiembrosOnline()

    expect(chatApi.listarMiembros).toHaveBeenCalledWith(5, 0, 100)
    expect(miembrosOnline.value.map(m => m.personajeId)).toEqual([2, 10, 1])
    expect(onlineMap.value.get(1)).toBe(true)
    expect(onlineMap.value.get(2)).toBe(true)
    expect(onlineMap.value.get(10)).toBe(true)
    expect(statusMap.value.get(1)).toBe('ausente')
    expect(cargandoMiembrosOnline.value).toBe(false)
  })

  it('no hace nada sin canal activo', async () => {
    const { cargarMiembrosOnline } = useChatPresencia({ canalActivo: ref(null) })
    await cargarMiembrosOnline()
    expect(chatApi.listarMiembros).not.toHaveBeenCalled()
  })
})

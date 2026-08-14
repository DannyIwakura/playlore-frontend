import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useChatBusqueda } from './useChatBusqueda'
import { chatApi } from '../../../services/chatApi'

vi.mock('../../../services/chatApi', () => ({
  chatApi: {
    buscarMensajesCanal: vi.fn(),
  },
}))

function setup() {
  const canalActivo = ref<any>({ id: 5 })
  const ctx = useChatBusqueda({ canalActivo })
  return { ctx, canalActivo }
}

describe('useChatBusqueda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('busca resultados de la primera pagina', async () => {
    const { ctx } = setup()
    vi.mocked(chatApi.buscarMensajesCanal).mockResolvedValue({
      data: { content: [{ id: 1, contenido: 'hola' }], last: true },
    } as any)

    await ctx.buscar('hola')

    expect(chatApi.buscarMensajesCanal).toHaveBeenCalledWith(5, 'hola', 0, 15)
    expect(ctx.busquedaAbierta.value).toBe(true)
    expect(ctx.resultados.value.map((r: any) => r.id)).toEqual([1])
    expect(ctx.hayMasResultados.value).toBe(false)
    expect(ctx.paginaResultados.value).toBe(1)
  })

  it('ignora busquedas vacias y no abre el panel', async () => {
    const { ctx } = setup()

    await ctx.buscar('   ')

    expect(chatApi.buscarMensajesCanal).not.toHaveBeenCalled()
    expect(ctx.busquedaAbierta.value).toBe(false)
  })

  it('recorta el termino y marca hayMas si hay mas paginas', async () => {
    const { ctx } = setup()
    vi.mocked(chatApi.buscarMensajesCanal).mockResolvedValue({
      data: { content: [{ id: 1 }], last: false },
    } as any)

    await ctx.buscar('  dragon  ')

    expect(chatApi.buscarMensajesCanal).toHaveBeenCalledWith(5, 'dragon', 0, 15)
    expect(ctx.hayMasResultados.value).toBe(true)
  })

  it('carga mas resultados sin duplicar', async () => {
    const { ctx } = setup()
    vi.mocked(chatApi.buscarMensajesCanal)
      .mockResolvedValueOnce({ data: { content: [{ id: 1 }], last: false } } as any)
      .mockResolvedValueOnce({ data: { content: [{ id: 2 }, { id: 1 }], last: true } } as any)

    await ctx.buscar('hola')
    await ctx.cargarMasResultados()

    expect(chatApi.buscarMensajesCanal).toHaveBeenLastCalledWith(5, 'hola', 1, 15)
    expect(ctx.resultados.value.map((r: any) => r.id)).toEqual([1, 2])
    expect(ctx.hayMasResultados.value).toBe(false)
  })

  it('no carga mas si no hay mas paginas', async () => {
    const { ctx } = setup()
    vi.mocked(chatApi.buscarMensajesCanal).mockResolvedValue({
      data: { content: [{ id: 1 }], last: true },
    } as any)

    await ctx.buscar('hola')
    await ctx.cargarMasResultados()

    expect(chatApi.buscarMensajesCanal).toHaveBeenCalledTimes(1)
  })

  it('guarda el error cuando la busqueda falla', async () => {
    const { ctx } = setup()
    vi.mocked(chatApi.buscarMensajesCanal).mockRejectedValue(new Error('boom'))

    await ctx.buscar('hola')

    expect(ctx.errorBusqueda.value).toBe('No se pudo realizar la búsqueda')
    expect(ctx.buscando.value).toBe(false)
  })

  it('cerrarBusqueda limpia todo el estado', async () => {
    const { ctx } = setup()
    vi.mocked(chatApi.buscarMensajesCanal).mockResolvedValue({
      data: { content: [{ id: 1 }], last: false },
    } as any)
    await ctx.buscar('hola')

    ctx.cerrarBusqueda()

    expect(ctx.busquedaAbierta.value).toBe(false)
    expect(ctx.terminoBusqueda.value).toBe('')
    expect(ctx.resultados.value).toEqual([])
    expect(ctx.hayMasResultados.value).toBe(false)
  })
})

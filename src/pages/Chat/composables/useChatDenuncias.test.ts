import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useChatDenuncias } from './useChatDenuncias'
import api from '../../../services/api'

vi.mock('../../../services/api', () => ({
  default: { post: vi.fn() },
}))

function setup() {
  const canalActivo = ref<any>({ id: 5 })
  const cerrarContextMenu = vi.fn()
  const aviso = ref<string | null>(null)
  const ctx = useChatDenuncias({ canalActivo, cerrarContextMenu, aviso })
  return { ctx, cerrarContextMenu, aviso }
}

describe('useChatDenuncias', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('denunciarMensaje prepara el objetivo y limpia los campos', () => {
    const { ctx, cerrarContextMenu } = setup()
    ctx.denunciaMotivo.value = 'spam'
    ctx.denunciaDetalle.value = 'detalle'

    ctx.denunciarMensaje({ id: 9 })

    expect(cerrarContextMenu).toHaveBeenCalled()
    expect(ctx.denunciaTarget.value).toEqual({ tipo: 'MENSAJE_CANAL', tipoId: 9 })
    expect(ctx.denunciaMotivo.value).toBe('')
    expect(ctx.denunciaDetalle.value).toBe('')
  })

  it('denunciarCanalActivo usa el canal como objetivo', () => {
    const { ctx } = setup()
    ctx.denunciarCanalActivo()
    expect(ctx.denunciaTarget.value).toEqual({ tipo: 'CANAL', tipoId: 5 })
  })

  it('exige motivo obligatorio', async () => {
    const { ctx, aviso } = setup()
    ctx.denunciaTarget.value = { tipo: 'MENSAJE_CANAL', tipoId: 9 }

    await ctx.enviarDenunciaMensaje()

    expect(aviso.value).toBe('El motivo es obligatorio para enviar la denuncia.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('envía la denuncia y reinicia el estado', async () => {
    const { ctx, aviso } = setup()
    ctx.denunciaTarget.value = { tipo: 'MENSAJE_CANAL', tipoId: 9 }
    ctx.denunciaMotivo.value = '  spam  '
    ctx.denunciaDetalle.value = '  detalle  '
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

    await ctx.enviarDenunciaMensaje()

    expect(api.post).toHaveBeenCalledWith('/denuncias', {
      tipo: 'MENSAJE_CANAL',
      tipoId: 9,
      motivo: 'spam',
      detalle: 'detalle',
    })
    expect(ctx.denunciaTarget.value).toBeNull()
    expect(ctx.enviandoDenuncia.value).toBe(false)
    expect(aviso.value).toContain('Denuncia enviada')
  })

  it('muestra el error devuelto por la API', async () => {
    const { ctx, aviso } = setup()
    ctx.denunciaTarget.value = { tipo: 'CANAL', tipoId: 5 }
    ctx.denunciaMotivo.value = 'spam'
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { error: 'motivo inválido' } },
    })

    await ctx.enviarDenunciaMensaje()

    expect(aviso.value).toBe('motivo inválido')
    expect(ctx.enviandoDenuncia.value).toBe(false)
  })

  it('cae a un mensaje genérico si no hay error estructurado', async () => {
    const { ctx, aviso } = setup()
    ctx.denunciaTarget.value = { tipo: 'CANAL', tipoId: 5 }
    ctx.denunciaMotivo.value = 'spam'
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))

    await ctx.enviarDenunciaMensaje()

    expect(aviso.value).toBe('Error al enviar la denuncia.')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MensajeInvitacion from './MensajeInvitacion.vue'
import { chatApi } from '../../services/chatApi'

vi.mock('../../services/chatApi', () => ({
  chatApi: {
    aceptarInvitacion: vi.fn(),
    rechazarInvitacion: vi.fn(),
  },
}))

const INVITACION = {
  id: 31,
  canalId: 7,
  canalNombre: 'Sala Secreta',
  canalDescripcion: 'Solo para elegidos',
  canalImagenUrl: null,
  invitadorId: 12,
  invitadorNombre: 'Aragorn',
  invitadoId: 20,
  invitadoNombre: 'Boromir',
  estado: 'PENDIENTE',
}

const MSG = {
  id: 99,
  emisorId: 12,
  receptorId: 20,
  contenido: 'Te ha invitado al canal "Sala Secreta"',
  fechaEnvio: '2026-11-17T08:00:00.000Z',
  esMio: false,
  invitacion: { ...INVITACION },
}

let wrapper: ReturnType<typeof mount> | null = null

function montar(props: Record<string, unknown> = {}) {
  wrapper = mount(MensajeInvitacion, {
    props: { msg: { ...MSG, ...props } },
  })
  return wrapper
}

beforeEach(() => {
  vi.mocked(chatApi.aceptarInvitacion).mockReset()
  vi.mocked(chatApi.rechazarInvitacion).mockReset()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('MensajeInvitacion', () => {
  it('muestra el canal y los botones al personaje invitado', () => {
    const w = montar()

    expect(w.text()).toContain('Sala Secreta')
    expect(w.text()).toContain('De Aragorn')
    expect(w.text()).toContain('Solo para elegidos')
    expect(w.find('.invitacion-card__estado').text()).toBe('Pendiente')
    expect(w.find('.invitacion-card__acciones').exists()).toBe(true)
    expect(w.findAll('.invitacion-card__acciones button')).toHaveLength(2)
  })

  it('al invitador le muestra el estado sin acciones', () => {
    const w = montar({ esMio: true })

    expect(w.text()).toContain('Invitación enviada')
    expect(w.text()).toContain('Esperando respuesta')
    expect(w.find('.invitacion-card__acciones').exists()).toBe(false)
  })

  it('aceptar une al canal y avisa al padre', async () => {
    vi.mocked(chatApi.aceptarInvitacion).mockResolvedValue({
      data: { ...INVITACION, estado: 'ACEPTADA' },
    })
    const w = montar()

    await w.findAll('.invitacion-card__acciones button')[0].trigger('click')
    await vi.waitFor(() => expect(w.emitted('unirse')).toEqual([[7]]))

    expect(chatApi.aceptarInvitacion).toHaveBeenCalledWith(31)
    expect(w.emitted('resuelta')).toEqual([['ACEPTADA']])
    expect(w.find('.invitacion-card__estado').text()).toBe('Aceptada')
    expect(w.find('.invitacion-card__acciones').exists()).toBe(false)
  })

  it('rechazar cambia el estado y no une al canal', async () => {
    vi.mocked(chatApi.rechazarInvitacion).mockResolvedValue({
      data: { ...INVITACION, estado: 'RECHAZADA' },
    })
    const w = montar()

    await w.findAll('.invitacion-card__acciones button')[1].trigger('click')
    await vi.waitFor(() => expect(w.emitted('resuelta')).toEqual([['RECHAZADA']]))

    expect(chatApi.rechazarInvitacion).toHaveBeenCalledWith(31)
    expect(w.emitted('unirse')).toBeUndefined()
    expect(w.find('.invitacion-card__estado').text()).toBe('Rechazada')
  })

  it('propaga el mensaje de error del backend', async () => {
    vi.mocked(chatApi.aceptarInvitacion).mockRejectedValue({
      response: { data: { error: 'Estás baneado de este canal' } },
    })
    const w = montar()

    await w.findAll('.invitacion-card__acciones button')[0].trigger('click')
    await vi.waitFor(() =>
      expect(w.emitted('error')).toEqual([['Estás baneado de este canal']])
    )

    expect(w.find('.invitacion-card__estado').text()).toBe('Pendiente')
  })

  it('una invitacion ya aceptada no ofrece botones', () => {
    const w = montar({
      invitacion: { ...INVITACION, estado: 'ACEPTADA' },
    })

    expect(w.text()).toContain('Ya formas parte de este canal')
    expect(w.find('.invitacion-card__acciones').exists()).toBe(false)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GaleriaImagenes from './GaleriaImagenes.vue'
import api from '../services/api'

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const IMAGENES = [
  {
    idImagen: 1,
    idPersonaje: 7,
    url: '/uno.jpg',
    nombreOriginal: 'uno',
    fechaSubida: '2024-01-01T10:00:00',
    orden: 0,
  },
  {
    idImagen: 2,
    idPersonaje: 7,
    url: '/dos.jpg',
    nombreOriginal: 'dos',
    fechaSubida: '2024-01-02T10:00:00',
    orden: 1,
  },
]

// jsdom no implementa el comportamiento modal de <dialog>.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
  vi.mocked(api.get).mockResolvedValue({ data: IMAGENES })
})

afterEach(() => {
  document.body.style.overflow = ''
  vi.clearAllMocks()
})

async function montar() {
  const wrapper = mount(GaleriaImagenes, {
    props: { personajeId: 7, esPropietario: true },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function visor(): HTMLDialogElement | null {
  return document.body.querySelector<HTMLDialogElement>('dialog.carousel-dialog')
}

describe('GaleriaImagenes', () => {
  it('carga las imágenes y expone botones con nombre accesible', async () => {
    const wrapper = await montar()

    expect(api.get).toHaveBeenCalledWith('/personajes/7/imagenes')
    const abrir = wrapper.findAll('.imagen-abrir')
    expect(abrir).toHaveLength(2)
    expect(abrir[0].attributes('aria-label')).toBe('Ampliar imagen: uno')
    expect(wrapper.find('.btn-eliminar').attributes('aria-label')).toBe('Eliminar imagen: uno')

    wrapper.unmount()
  })

  it('abre el visor como diálogo modal y bloquea el scroll', async () => {
    const wrapper = await montar()

    await wrapper.findAll('.imagen-abrir')[1].trigger('click')
    await flushPromises()

    const dialogo = visor()
    expect(dialogo).not.toBeNull()
    expect(dialogo?.open).toBe(true)
    expect(dialogo?.textContent).toContain('dos')
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()
  })

  it('cierra con cancel (Escape) y restaura el scroll', async () => {
    const wrapper = await montar()
    await wrapper.find('.imagen-abrir').trigger('click')
    await flushPromises()

    const dialogo = visor()!
    dialogo.dispatchEvent(new Event('cancel'))
    await flushPromises()

    expect(visor()).toBeNull()
    expect(document.body.style.overflow).toBe('')

    wrapper.unmount()
  })

  it('navega con las flechas dentro del visor', async () => {
    const wrapper = await montar()
    await wrapper.find('.imagen-abrir').trigger('click')
    await flushPromises()

    const dialogo = visor()!
    dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await flushPromises()
    expect(dialogo.textContent).toContain('dos')

    dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await flushPromises()
    expect(dialogo.textContent).toContain('uno')

    wrapper.unmount()
  })

  it('marca la miniatura activa con aria-current', async () => {
    const wrapper = await montar()
    await wrapper.findAll('.imagen-abrir')[1].trigger('click')
    await flushPromises()

    const miniaturas = visor()!.querySelectorAll('.carousel-thumb')
    expect(miniaturas[0].getAttribute('aria-current')).toBeNull()
    expect(miniaturas[1].getAttribute('aria-current')).toBe('true')

    wrapper.unmount()
  })
})

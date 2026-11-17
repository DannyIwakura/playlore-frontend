import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AnadirCategoriaForm from './AnadirCategoriaForm.vue'
import api from '../../services/api'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const CATEGORIAS = [
  { idCategoria: 1, nombre: 'Fantasia' },
  { idCategoria: 2, nombre: 'Ciencia ficcion' },
]

const RELACIONES = [{ id: 10, idCategoria: 1, nombreCategoria: 'Fantasia' }]

let wrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/categorias') return Promise.resolve({ data: { content: CATEGORIAS } })
    return Promise.resolve({ data: RELACIONES })
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.clearAllMocks()
})

async function montar(props: Record<string, unknown> = {}) {
  wrapper = mount(AnadirCategoriaForm, {
    props: { idPersonaje: 7, nombrePersonaje: 'Kaelen el Errante', ...props },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('AnadirCategoriaForm', () => {
  it('expone el dialogo con nombre accesible y el contexto del personaje', async () => {
    const w = await montar()
    const dialogo = w.find('[role="dialog"]')
    expect(dialogo.attributes('aria-modal')).toBe('true')

    const id = dialogo.attributes('aria-labelledby')
    expect(id).toBeTruthy()
    expect(w.find(`#${id}`).text()).toBe('Gestionar categorías')
    expect(w.text()).toContain('Kaelen el Errante')
    expect(w.text()).not.toContain('ID Personaje')
  })

  it('carga las categorias asignadas y las ofrece para quitar', async () => {
    const w = await montar()

    const chips = w.findAll('.categorias-chip')
    expect(chips).toHaveLength(1)
    expect(chips[0].text()).toContain('Fantasia')

    const quitar = chips[0].find('button')
    expect(quitar.attributes('type')).toBe('button')
    expect(quitar.attributes('aria-label')).toBe('Quitar categoría Fantasia')
  })

  it('no ofrece en el selector las categorias que ya tiene', async () => {
    const w = await montar()

    const opciones = w.findAll('#categoria-nueva option').map((o) => o.text())
    expect(opciones).toContain('Ciencia ficcion')
    expect(opciones).not.toContain('Fantasia')
  })

  it('asigna una categoria, la pinta al instante y avisa al padre', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 11, idCategoria: 2, nombreCategoria: 'Ciencia ficcion' },
    })
    const w = await montar()

    const boton = w.findAll('button').find((b) => b.text().includes('Asignar categoría'))!
    expect(boton.attributes('disabled')).toBeDefined()

    await w.find('#categoria-nueva').setValue('2')
    expect(boton.attributes('disabled')).toBeUndefined()

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/personaje-categorias', {
      idPersonaje: 7,
      idCategoria: 2,
    })
    expect(w.findAll('.categorias-chip')).toHaveLength(2)
    expect(w.text()).toContain('Ciencia ficcion')
    expect(w.emitted('success')).toBeTruthy()
  })

  it('quita la categoria y avisa al padre', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: null })
    const w = await montar()

    await w.find('.categorias-chip button').trigger('click')
    await flushPromises()

    expect(api.delete).toHaveBeenCalledWith('/personaje-categorias/10')
    expect(w.findAll('.categorias-chip')).toHaveLength(0)
    expect(w.text()).toContain('Sin categorías asignadas')
    expect(w.emitted('success')).toBeTruthy()
  })

  it('explica el fallo al cargar y permite reintentar', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('500'))
    const w = await montar()

    expect(w.find('[role="alert"]').text()).toContain('No pudimos cargar las categorías')
    expect(w.find('#categoria-nueva').exists()).toBe(false)

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/categorias') return Promise.resolve({ data: { content: CATEGORIAS } })
      return Promise.resolve({ data: RELACIONES })
    })
    await w.findAll('button').find((b) => b.text() === 'Reintentar')!.trigger('click')
    await flushPromises()

    expect(w.find('#categoria-nueva').exists()).toBe(true)
    expect(w.findAll('.categorias-chip')).toHaveLength(1)
  })

  it('avisa si falla la asignacion sin perder lo ya escrito', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('409'))
    const w = await montar()

    await w.find('#categoria-nueva').setValue('2')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('[role="dialog"][aria-label="Aviso"]').text()).toContain(
      'No se pudo asignar la categoría'
    )
    expect((w.find('#categoria-nueva').element as HTMLSelectElement).value).toBe('2')
    expect(w.emitted('success')).toBeFalsy()
  })

  it('explica cuando ya no quedan categorias disponibles', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/categorias') return Promise.resolve({ data: { content: CATEGORIAS } })
      return Promise.resolve({
        data: [
          { id: 10, idCategoria: 1, nombreCategoria: 'Fantasia' },
          { id: 11, idCategoria: 2, nombreCategoria: 'Ciencia ficcion' },
        ],
      })
    })
    const w = await montar()

    expect(w.text()).toContain('ya tiene todas las categorías disponibles')
    expect(w.find('#categoria-nueva').attributes('disabled')).toBeDefined()
    expect(
      w.findAll('button').find((b) => b.text().includes('Asignar categoría'))!.attributes('disabled')
    ).toBeDefined()
  })

  it('cierra desde el boton Cerrar', async () => {
    const w = await montar()
    await w.findAll('button').find((b) => b.text() === 'Cerrar')!.trigger('click')
    expect(w.emitted('close')).toBeTruthy()
  })
})

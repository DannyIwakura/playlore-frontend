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

beforeEach(() => {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/categorias') {
      return Promise.resolve({ data: { content: CATEGORIAS } })
    }
    return Promise.resolve({ data: [{ id: 10, idCategoria: 1, nombreCategoria: 'Fantasia' }] })
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

async function montar() {
  const wrapper = mount(AnadirCategoriaForm, {
    props: { idPersonaje: 7 },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('AnadirCategoriaForm', () => {
  it('expone el diálogo con nombre accesible', async () => {
    const wrapper = await montar()
    const dialogo = wrapper.find('[role="dialog"]')
    expect(dialogo.attributes('aria-modal')).toBe('true')
    const id = dialogo.attributes('aria-labelledby')
    expect(id).toBeTruthy()
    expect(wrapper.find(`#${id}`).text()).toContain('Gestionar')
  })

  it('asocia la etiqueta al selector de categoría', async () => {
    const wrapper = await montar()
    const select = wrapper.find('select')
    const id = select.attributes('id')
    expect(id).toBeTruthy()
    expect(wrapper.find(`label[for="${id}"]`).exists()).toBe(true)
  })

  it('el botón de quitar es de tipo button y anuncia qué categoría elimina', async () => {
    const wrapper = await montar()
    const quitar = wrapper.find('button.btn-eliminar-pildora')
    expect(quitar.attributes('type')).toBe('button')
    expect(quitar.attributes('aria-label')).toBe('Quitar categoría Fantasia')
  })

  it('elimina la categoría y avisa del éxito', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: null })
    const wrapper = await montar()

    await wrapper.find('button.btn-eliminar-pildora').trigger('click')
    await flushPromises()

    expect(api.delete).toHaveBeenCalledWith('/personaje-categorias/10')
    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.text()).toContain('Sin categorías asignadas')
  })
})

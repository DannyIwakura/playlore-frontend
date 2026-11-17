import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TablaAdmin from './TablaAdmin.vue'

const columnas = [{ etiqueta: 'Nombre' }, { etiqueta: 'Rol' }]

function montar(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(TablaAdmin, {
    props: { titulo: 'Usuarios registrados', columnas, total: 1, ...props },
    slots: {
      default: '<tr><th scope="row">Ada</th><td data-etiqueta="Rol">Administradora</td></tr>',
      ...slots,
    },
  })
}

describe('TablaAdmin', () => {
  it('asocia la region de la tabla con el titulo visible solo para lectores', () => {
    const wrapper = montar()
    const region = wrapper.find('[role="region"]')
    const caption = wrapper.find('caption')

    expect(region.attributes('tabindex')).toBe('0')
    expect(region.attributes('aria-labelledby')).toBe(caption.attributes('id'))
    expect(caption.classes()).toContain('visually-hidden')
    expect(caption.text()).toBe('Usuarios registrados')
  })

  it('pinta la cabecera con una columna por etiqueta', () => {
    const wrapper = montar()
    const cabeceras = wrapper.findAll('thead th')

    expect(cabeceras.map((th) => th.text())).toEqual(['Nombre', 'Rol'])
    expect(cabeceras.every((th) => th.attributes('scope') === 'col')).toBe(true)
  })

  it('muestra el error y oculta la tabla', () => {
    const wrapper = montar({ error: 'Error al cargar los usuarios.', total: 3 })

    expect(wrapper.find('[role="alert"]').text()).toContain('Error al cargar los usuarios.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('muestra el estado de carga con role status', () => {
    const wrapper = montar({ cargando: true, total: 3 })

    expect(wrapper.find('[role="status"]').text()).toContain('Cargando')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('muestra el mensaje de vacio cuando no hay filas', () => {
    const wrapper = montar({ total: 0, vacio: 'No hay usuarios registrados todavía.' })

    expect(wrapper.find('[role="status"]').text()).toContain('No hay usuarios registrados todavía.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('muestra el resumen y mantiene el pie de paginacion con cero filas', () => {
    const wrapper = montar(
      { total: 0, resumen: '0 de 12 usuarios' },
      { pie: '<nav class="paginador">1</nav>' }
    )

    expect(wrapper.find('.pl-tabla-admin__resumen').text()).toBe('0 de 12 usuarios')
    expect(wrapper.find('.paginador').exists()).toBe(true)
  })
})

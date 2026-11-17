import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ModalFormulario from './ModalFormulario.vue'

function montar() {
  return mount(ModalFormulario, {
    props: { titulo: 'Denunciar a Ada' },
    slots: { default: '<p>Contenido del formulario</p>' },
    attachTo: document.body,
  })
}

describe('ModalFormulario', () => {
  it('expone un dialogo modal con nombre accesible desde el titulo', () => {
    const wrapper = montar()
    const dialogo = wrapper.find('[role="dialog"]')
    const titulo = wrapper.find('h2')

    expect(dialogo.attributes('aria-modal')).toBe('true')
    expect(dialogo.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    expect(titulo.text()).toBe('Denunciar a Ada')
    expect(wrapper.text()).toContain('Contenido del formulario')
    wrapper.unmount()
  })

  it('emite cerrar con el boton de cerrar y con el backdrop', async () => {
    const wrapper = montar()

    await wrapper.find('button[aria-label="Cerrar"]').trigger('click')
    await wrapper.find('.modal-backdrop-custom').trigger('click')

    expect(wrapper.emitted('cerrar')).toHaveLength(2)
    wrapper.unmount()
  })

  it('cierra con Escape y enfoca el dialogo al montar', async () => {
    const wrapper = montar()
    const dialogo = wrapper.find('[role="dialog"]')

    expect(document.activeElement).toBe(dialogo.element)
    await dialogo.trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('cerrar')).toHaveLength(1)
    wrapper.unmount()
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ModalAviso from './ModalAviso.vue'

describe('ModalAviso', () => {
  it('renderiza mensaje y título con roles accesibles', () => {
    const wrapper = mount(ModalAviso, { props: { mensaje: 'algo salió mal', titulo: 'Error' } })
    expect(wrapper.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.find('[role="dialog"]').attributes('aria-label')).toBe('Error')
    expect(wrapper.text()).toContain('algo salió mal')
  })

  it('emite cerrar con el botón Aceptar y con el de cerrar', async () => {
    const wrapper = mount(ModalAviso, { props: { mensaje: 'x' } })
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('cerrar')).toBeTruthy()
  })

  it('cierra al hacer clic en el backdrop', async () => {
    const wrapper = mount(ModalAviso, { props: { mensaje: 'x' } })
    await wrapper.find('.modal-backdrop-custom').trigger('click')
    expect(wrapper.emitted('cerrar')).toBeTruthy()
  })

  it('cierra con la tecla Escape (useModalFocus)', async () => {
    const wrapper = mount(ModalAviso, { props: { mensaje: 'x' } })
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('cerrar')).toBeTruthy()
  })
})

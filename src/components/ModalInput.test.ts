import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ModalInput from './ModalInput.vue'

describe('ModalInput', () => {
  it('renderiza el diálogo accesible con etiqueta y placeholder', () => {
    const wrapper = mount(ModalInput, {
      props: { titulo: 'Renombrar', etiqueta: 'Nombre', placeholder: 'Escribe...' },
    })
    expect(wrapper.find('[role="dialog"]').attributes('aria-label')).toBe('Renombrar')
    expect(wrapper.find('input').attributes('placeholder')).toBe('Escribe...')
    expect(wrapper.text()).toContain('Nombre')
  })

  it('no roba el foco del diálogo si el input lleva autofocus', async () => {
    const wrapper = mount(ModalInput, { props: { titulo: 'T', etiqueta: 'E' } })
    const dialog = wrapper.find('[role="dialog"]').element
    expect(wrapper.find('input').attributes('autofocus')).toBeDefined()
    expect(document.activeElement).not.toBe(dialog)
  })

  it('deshabilita confirmar cuando el valor está vacío y emite el valor recortado', async () => {
    const wrapper = mount(ModalInput, { props: { titulo: 'T', etiqueta: 'E' } })
    const confirmar = wrapper.find('button[type="submit"]')
    expect(confirmar.attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('  valor  ')
    expect(confirmar.attributes('disabled')).toBeUndefined()

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('confirmar')![0]).toEqual(['valor'])
  })

  it('emite cancelar con el botón y con Escape', async () => {
    const wrapper = mount(ModalInput, { props: { titulo: 'T', etiqueta: 'E' } })
    await wrapper.find('button[type="button"]').trigger('click')
    expect(wrapper.emitted('cancelar')).toBeTruthy()
  })
})

import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import RichTextEditor from './RichTextEditor.vue'

async function montar(props: Record<string, unknown>) {
  const wrapper = mount(RichTextEditor, { props })
  await nextTick()
  await nextTick()
  return wrapper
}

describe('RichTextEditor', () => {
  it('expone la barra como toolbar con grupos y etiquetas', async () => {
    const wrapper = await montar({ modelValue: '' })
    const toolbar = wrapper.find('[role="toolbar"]')
    const contenido = wrapper.find('.ProseMirror')

    expect(toolbar.exists()).toBe(true)
    expect(toolbar.attributes('aria-label')).toBe('Formato del trasfondo')
    expect(contenido.exists()).toBe(true)
    expect(toolbar.attributes('aria-controls')).toBe(contenido.attributes('id'))
    expect(wrapper.findAll('[role="group"]')).toHaveLength(4)
  })

  it('etiqueta todos los botones y expone su estado', async () => {
    const wrapper = await montar({ modelValue: '' })
    const botones = wrapper.findAll('.icon-btn')

    expect(botones).toHaveLength(7)
    expect(botones.every((b) => !!b.attributes('aria-label'))).toBe(true)
    expect(botones[0].attributes('aria-pressed')).toBe('false')
    expect(wrapper.find('select').attributes('aria-label')).toBe('Tamaño de letra')
    expect(wrapper.find('input[type="color"]').attributes('aria-label')).toBe('Color del texto')
  })

  it('usa el id y la etiqueta del campo para el area editable', async () => {
    const wrapper = await montar({ modelValue: '', id: 'trasfondo', etiqueta: 'Trasfondo' })
    const contenido = wrapper.find('.ProseMirror')

    expect(contenido.exists()).toBe(true)
    expect(contenido.attributes('id')).toBe('trasfondo')
    expect(contenido.attributes('role')).toBe('textbox')
    expect(contenido.attributes('aria-multiline')).toBe('true')
    expect(contenido.attributes('aria-label')).toBe('Trasfondo')
    expect(wrapper.find('[role="toolbar"]').attributes('aria-controls')).toBe('trasfondo')
  })
})

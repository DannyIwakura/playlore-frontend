import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ExpandableText from './ExpandableText.vue'

describe('ExpandableText', () => {
  it('muestra el texto y el fallback cuando no hay texto', () => {
    const conTexto = mount(ExpandableText, { props: { text: 'hola' } })
    expect(conTexto.find('.expandable-content').text()).toBe('hola')
    const sinTexto = mount(ExpandableText, { props: { text: null } })
    expect(sinTexto.find('.expandable-content').text()).toBe('Sin descripción')
  })

  it('no muestra el botón si el texto no desborda', async () => {
    const wrapper = mount(ExpandableText, { props: { text: 'corto' } })
    await nextTick()
    expect(wrapper.find('.expand-btn').exists()).toBe(false)
  })

  it('muestra el botón cuando desborda y alterna el estado expandido', async () => {
    const wrapper = mount(ExpandableText, { props: { text: 'texto largo' } })
    const el = wrapper.find('.expandable-content').element
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => 200 })
    Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => 60 })
    await wrapper.setProps({ text: 'texto largo 2' })
    await nextTick()

    const btn = wrapper.find('.expand-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('Expandir')

    await btn.trigger('click')
    expect(wrapper.find('.expandable-content').classes()).toContain('expanded')
    expect(btn.text()).toBe('Contraer')

    await btn.trigger('click')
    expect(wrapper.find('.expandable-content').classes()).not.toContain('expanded')
  })
})

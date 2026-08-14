import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginadorComponent from './PaginadorComponent.vue'

describe('PaginadorComponent', () => {
  it('no se renderiza con una sola página', () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 0, totalPaginas: 1 } })
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('renderiza las páginas y marca la activa', () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 1, totalPaginas: 5 } })
    const numeros = wrapper.findAll('.page-item')
    expect(numeros).toHaveLength(7)
    expect(numeros[2].classes()).toContain('active')
    expect(numeros[2].text()).toBe('2')
  })

  it('deshabilita anterior en la primera página y siguiente en la última', () => {
    const primero = mount(PaginadorComponent, { props: { paginaActual: 0, totalPaginas: 3 } })
    expect(primero.findAll('.page-item')[0].classes()).toContain('disabled')
    expect(primero.findAll('.page-item')[primero.findAll('.page-item').length - 1].classes()).not.toContain('disabled')

    const ultimo = mount(PaginadorComponent, { props: { paginaActual: 2, totalPaginas: 3 } })
    const items = ultimo.findAll('.page-item')
    expect(items[items.length - 1].classes()).toContain('disabled')
  })

  it('emite cambiar al pulsar una página', async () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 0, totalPaginas: 5 } })
    await wrapper.findAll('.page-link')[3].trigger('click')
    expect(wrapper.emitted('cambiar')![0]).toEqual([2])
  })

  it('emite cambiar con anterior y siguiente', async () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 2, totalPaginas: 5 } })
    await wrapper.findAll('.page-link')[0].trigger('click')
    expect(wrapper.emitted('cambiar')![0]).toEqual([1])
    await wrapper.findAll('.page-link')[wrapper.findAll('.page-link').length - 1].trigger('click')
    expect(wrapper.emitted('cambiar')![1]).toEqual([3])
  })
})

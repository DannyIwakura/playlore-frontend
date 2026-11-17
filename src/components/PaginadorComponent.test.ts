import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginadorComponent from './PaginadorComponent.vue'

describe('PaginadorComponent', () => {
  it('no se renderiza con una sola página', () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 0, totalPaginas: 1 } })
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('renderiza las páginas y marca la actual', () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 1, totalPaginas: 5 } })
    const botones = wrapper.findAll('.pl-paginador__btn')
    expect(botones).toHaveLength(7)
    expect(botones[2].text()).toBe('2')
    expect(botones[2].attributes('aria-current')).toBe('page')
    expect(botones[1].attributes('aria-current')).toBeUndefined()
  })

  it('etiqueta la navegación y cada botón', () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 0, totalPaginas: 3 } })
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Paginación')
    expect(wrapper.findAll('.pl-paginador__btn')[0].attributes('aria-label')).toBe('Página anterior')
    expect(wrapper.findAll('.pl-paginador__btn')[2].attributes('aria-label')).toBe('Página 2')
    expect(wrapper.findAll('.pl-paginador__btn')[4].attributes('aria-label')).toBe('Página siguiente')
  })

  it('marca anterior y siguiente como no disponibles en los extremos', () => {
    const primero = mount(PaginadorComponent, { props: { paginaActual: 0, totalPaginas: 3 } })
    const botonesPrimero = primero.findAll('.pl-paginador__btn')
    expect(botonesPrimero[0].attributes('aria-disabled')).toBe('true')
    expect(botonesPrimero[botonesPrimero.length - 1].attributes('aria-disabled')).toBe('false')

    const ultimo = mount(PaginadorComponent, { props: { paginaActual: 2, totalPaginas: 3 } })
    const botonesUltimo = ultimo.findAll('.pl-paginador__btn')
    expect(botonesUltimo[0].attributes('aria-disabled')).toBe('false')
    expect(botonesUltimo[botonesUltimo.length - 1].attributes('aria-disabled')).toBe('true')
  })

  it('no emite fuera de rango aunque se pulse anterior o siguiente', async () => {
    const primero = mount(PaginadorComponent, { props: { paginaActual: 0, totalPaginas: 3 } })
    await primero.findAll('.pl-paginador__btn')[0].trigger('click')
    expect(primero.emitted('cambiar')).toBeUndefined()

    const ultimo = mount(PaginadorComponent, { props: { paginaActual: 2, totalPaginas: 3 } })
    const botones = ultimo.findAll('.pl-paginador__btn')
    await botones[botones.length - 1].trigger('click')
    expect(ultimo.emitted('cambiar')).toBeUndefined()
  })

  it('emite cambiar al pulsar una página', async () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 0, totalPaginas: 5 } })
    await wrapper.findAll('.pl-paginador__btn')[3].trigger('click')
    expect(wrapper.emitted('cambiar')![0]).toEqual([2])
  })

  it('emite cambiar con anterior y siguiente', async () => {
    const wrapper = mount(PaginadorComponent, { props: { paginaActual: 2, totalPaginas: 5 } })
    await wrapper.findAll('.pl-paginador__btn')[0].trigger('click')
    expect(wrapper.emitted('cambiar')![0]).toEqual([1])
    const botones = wrapper.findAll('.pl-paginador__btn')
    await botones[botones.length - 1].trigger('click')
    expect(wrapper.emitted('cambiar')![1]).toEqual([3])
  })
})

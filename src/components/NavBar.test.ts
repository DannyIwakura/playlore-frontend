import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NavBar from './NavBar.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    currentRoute: { value: { fullPath: '/' } },
  }),
}))

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    put: vi.fn(() => Promise.resolve({})),
  },
}))

vi.mock('../store/userStore', () => ({
  userStore: {
    usuario: { value: { id: 1, username: 'Prueba', role: 'USER', avatar: null } },
    setUsuario: vi.fn(),
  },
}))

function montar(logeado = false) {
  return mount(NavBar, {
    props: { logeado },
    global: { stubs: { RouterLink: true } },
  })
}

describe('NavBar', () => {
  it('abre y cierra el menú móvil con el mismo botón', async () => {
    const w = montar()
    const boton = w.find('.navbar-toggler')
    const panel = w.find('#navbarText')

    expect(boton.attributes('aria-controls')).toBe('navbarText')
    expect(boton.attributes('aria-expanded')).toBe('false')
    expect(boton.attributes('aria-label')).toBe('Abrir menú')
    expect(panel.classes()).not.toContain('show')

    await boton.trigger('click')
    expect(boton.attributes('aria-expanded')).toBe('true')
    expect(boton.attributes('aria-label')).toBe('Cerrar menú')
    expect(panel.classes()).toContain('show')

    await boton.trigger('click')
    expect(boton.attributes('aria-expanded')).toBe('false')
    expect(boton.attributes('aria-label')).toBe('Abrir menú')
    expect(panel.classes()).not.toContain('show')
  })

  it('no delega el colapso en Bootstrap para evitar manejadores duplicados', () => {
    const boton = montar().find('.navbar-toggler')
    expect(boton.attributes('data-bs-toggle')).toBeUndefined()
    expect(boton.attributes('data-bs-target')).toBeUndefined()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PerfilPersonajeView from './PerfilPersonajeView.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '12' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../../store/userStore', () => ({
  userStore: {
    usuario: { value: { id: 7, username: 'admin', role: 'ADMIN', avatar: null } },
    cargarDesdeToken: vi.fn(() => Promise.resolve()),
  },
}))

const PERSONAJE = {
  idPersonaje: 12,
  nombre: 'Kaelen el Errante',
  edadPersonaje: 128,
  genero: 'Masculino',
  avatar: 'https://cdn.playlore.test/kaelen.png',
  trasfondo: '<p>Nacido bajo la luna de plata.</p>',
  raza: 'Elfo',
  clase: 'Explorador',
  fechaCreacion: '2024-02-03T10:00:00.000Z',
  fechaModificacion: '2024-02-04T10:00:00.000Z',
  estadoPersonaje: 'ACTIVO',
  userId: 9,
}

const PROPIETARIO = {
  userId: 9,
  nombre: 'Lysandra',
  email: 'lysandra@playlore.test',
  avatar: null,
  ultimaConexion: '2026-11-17T08:00:00.000Z',
}

const CATEGORIAS = [
  { id: 1, idCategoria: 3, nombreCategoria: 'Héroes', descripcionCategoria: 'Personajes con un código moral firme.' },
  { id: 2, idCategoria: 5, nombreCategoria: 'Misterio', descripcionCategoria: '' },
]

let wrapper: ReturnType<typeof mount> | null = null

function montar(props: Record<string, unknown> = { personajeId: 12 }) {
  wrapper = mount(PerfilPersonajeView, {
    props,
    attachTo: document.body,
    global: {
      stubs: { NavBar: true, Footer: true, GaleriaImagenes: true, RouterLink: true },
      directives: {
        sanitize: (el: HTMLElement, binding: { value: unknown }) => {
          el.textContent = String(binding.value)
        },
      },
    },
  })
  return wrapper
}

function tab(w: ReturnType<typeof mount>, texto: string) {
  return w.findAll('[role="tab"]').find((el) => el.text().includes(texto))!
}

beforeEach(() => {
  ;(userStore.usuario as any).value = { id: 7, username: 'admin', role: 'ADMIN', avatar: null }
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/personajes/12') return Promise.resolve({ data: { ...PERSONAJE } })
    if (url === '/usuarios/9') return Promise.resolve({ data: { ...PROPIETARIO } })
    if (url === '/personaje-categorias/personaje/12') return Promise.resolve({ data: CATEGORIAS })
    return Promise.resolve({ data: [] })
  })
  vi.mocked(api.put).mockResolvedValue({ data: {} })
  vi.mocked(api.post).mockResolvedValue({ data: {} })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.clearAllMocks()
})

describe('PerfilPersonajeView', () => {
  it('muestra los datos del personaje y del propietario', async () => {
    const w = montar()
    await flushPromises()

    expect(w.text()).toContain('Kaelen el Errante')
    expect(w.text()).toContain('Explorador')
    expect(w.text()).toContain('Elfo')
    expect(w.text()).toContain('128 años')
    expect(w.text()).toContain('Lysandra')
    expect(w.find('.perfil-trasfondo').text()).toContain('Nacido bajo la luna de plata')
  })

  it('expone las pestanas con el patron ARIA y mueve la seleccion con el teclado', async () => {
    const w = montar()
    await flushPromises()

    const tablist = w.find('[role="tablist"]')
    expect(tablist.attributes('aria-label')).toBeTruthy()

    const tabs = w.findAll('[role="tab"]')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[0].attributes('tabindex')).toBe('0')
    expect(tabs[1].attributes('tabindex')).toBe('-1')
    expect(tabs[0].attributes('aria-controls')).toBe('panel-trasfondo')

    const panel = w.find('#panel-trasfondo')
    expect(panel.attributes('role')).toBe('tabpanel')
    expect(panel.attributes('aria-labelledby')).toBe('tab-trasfondo')

    await tabs[0].trigger('keydown', { key: 'ArrowRight' })
    expect(tab(w, 'Categorías').attributes('aria-selected')).toBe('true')
    expect(tab(w, 'Categorías').attributes('tabindex')).toBe('0')

    await tab(w, 'Categorías').trigger('keydown', { key: 'End' })
    expect(tab(w, 'Galería').attributes('aria-selected')).toBe('true')

    await tab(w, 'Galería').trigger('keydown', { key: 'ArrowRight' })
    expect(tab(w, 'Trasfondo').attributes('aria-selected')).toBe('true')

    await tab(w, 'Trasfondo').trigger('keydown', { key: 'ArrowLeft' })
    expect(tab(w, 'Galería').attributes('aria-selected')).toBe('true')
  })

  it('lista las categorias con nombre y descripcion visibles, sin tooltip', async () => {
    const w = montar()
    await flushPromises()

    await tab(w, 'Categorías').trigger('click')

    const filas = w.findAll('.perfil-categoria')
    expect(filas).toHaveLength(2)
    expect(filas[0].text()).toContain('Héroes')
    expect(filas[0].text()).toContain('Personajes con un código moral firme.')
    expect(filas[0].find('.perfil-categoria__punto').exists()).toBe(true)
    expect(w.find('[data-tooltip]').exists()).toBe(false)
  })

  it('pide confirmacion antes de desactivar y llama al endpoint al confirmar', async () => {
    const w = montar()
    await flushPromises()

    const desactivar = w.findAll('button').find((b) => b.text().includes('Desactivar perfil'))!
    await desactivar.trigger('click')

    const dialogo = w.find('[role="dialog"]')
    expect(dialogo.exists()).toBe(true)
    expect(dialogo.attributes('aria-label')).toBe('Desactivar perfil')
    expect(dialogo.text()).toContain('Kaelen el Errante')
    expect(api.put).not.toHaveBeenCalled()

    const confirmar = dialogo.findAll('button').find((b) => b.text().trim() === 'Desactivar')!
    await confirmar.trigger('click')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith('/personajes/admin/12/estado', { estado: 'DESACTIVADO' })
    expect(w.text()).toContain('Perfil desactivado · Solo visible para moderadores.')
    expect(w.find('[role="dialog"][aria-label="Desactivar perfil"]').exists()).toBe(false)
  })

  it('oculta el perfil desactivado a quien no modera', async () => {
    ;(userStore.usuario as any).value = { id: 7, username: 'visitante', role: 'USER', avatar: null }
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/personajes/12') {
        return Promise.resolve({ data: { ...PERSONAJE, estadoPersonaje: 'DESACTIVADO' } })
      }
      if (url === '/usuarios/9') return Promise.resolve({ data: { ...PROPIETARIO } })
      return Promise.resolve({ data: [] })
    })

    const w = montar()
    await flushPromises()

    expect(w.find('.perfil-layout').exists()).toBe(false)
    const alerta = w.find('.pl-alert--warning')
    expect(alerta.text()).toContain('Perfil desactivado')
  })

  it('mantiene la denuncia aunque falle la carga del propietario', async () => {
    ;(userStore.usuario as any).value = { id: 7, username: 'visitante', role: 'USER', avatar: null }
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/personajes/12') return Promise.resolve({ data: { ...PERSONAJE } })
      if (url === '/usuarios/9') return Promise.reject(new Error('500'))
      return Promise.resolve({ data: [] })
    })

    const w = montar()
    await flushPromises()

    expect(w.find('.perfil-propietario').exists()).toBe(false)
    expect(w.find('.perfil-acciones--suelta').exists()).toBe(true)
    expect(w.findAll('button').some((b) => b.text().includes('Denunciar personaje'))).toBe(true)
    expect(w.findAll('button').some((b) => b.text().includes('Ver perfil del jugador'))).toBe(false)
  })

  it('en modo modal muestra cabecera con cierre y no pinta NavBar ni Footer', async () => {
    const w = montar({ personajeId: 12, modoModal: true })
    await flushPromises()

    expect(w.find('.perfil-modal-cabecera').exists()).toBe(true)
    expect(w.find('nav-bar-stub').exists()).toBe(false)
    expect(w.find('footer-stub').exists()).toBe(false)
    expect(w.find('.perfil-modal-scroll').exists()).toBe(true)

    await w.find('button[aria-label="Cerrar perfil"]').trigger('click')
    expect(w.emitted('cerrar')).toBeTruthy()
  })
})

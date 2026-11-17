import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import NuevoPersonajeForm from './NuevoPersonajeForm.vue'
import api from '../../services/api'

const push = vi.fn()

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: {} }),
}))

vi.mock('../../store/userStore', () => ({
  userStore: {
    usuario: { value: { id: 7, username: 'admin', role: 'ADMIN', avatar: null } },
    cargarDesdeToken: vi.fn(),
  },
}))

let wrapper: ReturnType<typeof mount> | null = null

function montar() {
  wrapper = mount(NuevoPersonajeForm, {
    attachTo: document.body,
    global: {
      stubs: {
        NavBar: true,
        Footer: true,
        RouterLink: { template: '<a><slot /></a>' },
        RichTextEditor: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<textarea class="editor-stub" :value="modelValue" />',
        },
      },
    },
  })
  return wrapper
}

beforeEach(() => {
  vi.mocked(api.post).mockResolvedValue({ data: { idPersonaje: 12 } })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.clearAllMocks()
})

function campo(w: ReturnType<typeof mount>, id: string) {
  return w.find(`#${id}`)
}

describe('NuevoPersonajeForm', () => {
  it('organiza el formulario largo en tres secciones con titulo', async () => {
    const w = montar()

    const secciones = w.findAll('.pl-form-seccion')
    expect(secciones).toHaveLength(3)
    expect(w.find('#seccion-identidad').text()).toContain('Identidad')
    expect(w.find('#seccion-apariencia').text()).toContain('Apariencia')
    expect(w.find('#seccion-historia').text()).toContain('Historia')

    for (const seccion of secciones) {
      const id = seccion.attributes('aria-labelledby')
      expect(id).toBeTruthy()
      expect(w.find(`#${id}`).exists()).toBe(true)
    }
  })

  it('usa validacion propia: el submit no lo bloquea el required nativo', async () => {
    const w = montar()
    expect(w.find('form').attributes('novalidate')).toBeDefined()
    expect(w.find('input[required]').exists()).toBe(false)
  })

  it('explica los campos obligatorios, marca y enfoca el primero', async () => {
    const w = montar()

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).not.toHaveBeenCalled()
    expect(w.find('#nombre-error').text()).toContain('obligatorio')
    expect(w.find('#genero-error').text()).toContain('Elige un género')
    expect(campo(w, 'nombre').attributes('aria-invalid')).toBe('true')
    expect(campo(w, 'nombre').attributes('aria-describedby')).toBe('nombre-error')
    expect(document.activeElement?.id).toBe('nombre')
  })

  it('valida longitudes y edades no positivas antes de enviar', async () => {
    const w = montar()

    await campo(w, 'nombre').setValue('ab')
    await campo(w, 'genero').setValue('Masculino')
    await campo(w, 'edad').setValue('-3')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('#nombre-error').text()).toContain('entre 3 y 50')
    expect(w.find('#edad-error').text()).toContain('positivo')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('envia el personaje en FormData y vuelve a la lista con aviso', async () => {
    const w = montar()

    await campo(w, 'nombre').setValue('  Kaelen el Errante  ')
    await campo(w, 'genero').setValue('Masculino')
    await campo(w, 'raza').setValue('Elfo')
    await campo(w, 'clase').setValue('Explorador')
    await campo(w, 'edad').setValue('128')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledTimes(1)
    const [url, formData] = vi.mocked(api.post).mock.calls[0]
    expect(url).toBe('/personajes')
    expect(formData).toBeInstanceOf(FormData)
    expect((formData as FormData).get('personaje')).toBeTruthy()
    expect(push).toHaveBeenCalledWith({ path: '/personajes', query: { creacion: 'ok' } })
  })

  it('muestra el error general cuando el backend no da errores por campo', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { status: 500, data: { error: 'Ha ocurrido un error inesperado' } },
    })
    const w = montar()

    await campo(w, 'nombre').setValue('Kaelen el Errante')
    await campo(w, 'genero').setValue('Masculino')
    await w.find('form').trigger('submit')
    await flushPromises()

    const alerta = w.find('[role="alert"]')
    expect(alerta.text()).toContain('Ha ocurrido un error inesperado')
    expect(push).not.toHaveBeenCalled()
  })

  it('reparte los errores de validacion del backend por campo', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { status: 400, data: { nombre: 'El nombre ya existe' } },
    })
    const w = montar()

    await campo(w, 'nombre').setValue('Kaelen el Errante')
    await campo(w, 'genero').setValue('Masculino')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('#nombre-error').text()).toContain('El nombre ya existe')
    expect(document.activeElement?.id).toBe('nombre')
  })
})

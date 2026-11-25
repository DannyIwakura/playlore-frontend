import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import EditarPersonajeForm from './EditarPersonajeForm.vue'
import api from '../../services/api'

const push = vi.fn()

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: { id: '12' } }),
}))

const PERSONAJE = {
  idPersonaje: 12,
  nombre: 'Kaelen el Errante',
  genero: 'Masculino',
  edadPersonaje: 128,
  avatar: '/uploads/kaelen.png',
  trasfondo: '<p>Nacido bajo la luna de plata.</p>',
  raza: 'Elfo',
  clase: 'Explorador',
}

let wrapper: ReturnType<typeof mount> | null = null

function montar() {
  wrapper = mount(EditarPersonajeForm, {
    attachTo: document.body,
    global: {
      stubs: {
        NavBar: true,
        Footer: true,
        RouterLink: { template: '<a><slot /></a>' },
        GaleriaImagenes: true,
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
  vi.mocked(api.get).mockResolvedValue({ data: { ...PERSONAJE } })
  vi.mocked(api.put).mockResolvedValue({ data: {} })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.clearAllMocks()
})

describe('EditarPersonajeForm', () => {
  it('carga el personaje y rellena los campos por secciones', async () => {
    const w = montar()
    await flushPromises()

    expect(w.findAll('.pl-form-seccion')).toHaveLength(3)
    expect((w.find('#nombre').element as HTMLInputElement).value).toBe('Kaelen el Errante')
    expect((w.find('#genero').element as HTMLSelectElement).value).toBe('Masculino')
    expect((w.find('#edad').element as HTMLInputElement).value).toBe('128')
    expect((w.find('#raza').element as HTMLInputElement).value).toBe('Elfo')
    expect(w.find('.galeria-seccion').exists()).toBe(true)
  })

  it('muestra los anuncios del personaje para editarlos o crear otros nuevos', async () => {
    const w = montar()
    await flushPromises()

    const seccion = w.find('.anuncios-seccion')
    expect(seccion.exists()).toBe(true)
    expect(seccion.text()).toContain('Anuncios RP')
    expect(seccion.text()).toContain('Nuevo anuncio')
  })

  it('muestra el avatar actual con una ruta resuelta', async () => {
    const w = montar()
    await flushPromises()

    const src = w.find('.avatar-preview').attributes('src') ?? ''
    expect(src).toContain('/uploads/kaelen.png')
    expect(w.find('.avatar-preview').attributes('alt')).toBe('Avatar de Kaelen el Errante')
  })

  it('valida antes de enviar y enfoca el primer campo invalido', async () => {
    const w = montar()
    await flushPromises()

    await w.find('#nombre').setValue('')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(api.put).not.toHaveBeenCalled()
    expect(w.find('#nombre-error').text()).toContain('obligatorio')
    expect(document.activeElement?.id).toBe('nombre')
  })

  it('guarda con PUT y vuelve a la lista', async () => {
    const w = montar()
    await flushPromises()

    await w.find('#nombre').setValue('Kaelen el Errante')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(api.put).toHaveBeenCalledTimes(1)
    const [url, formData] = vi.mocked(api.put).mock.calls[0]
    expect(url).toBe('/personajes/12')
    expect(formData).toBeInstanceOf(FormData)
    expect(push).toHaveBeenCalledWith('/personajes')
  })

  it('muestra el error general si falla el guardado', async () => {
    vi.mocked(api.put).mockRejectedValue({
      response: { status: 403, data: { error: 'No tienes permisos para realizar esta acción' } },
    })
    const w = montar()
    await flushPromises()

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('[role="alert"]').text()).toContain('No tienes permisos')
    expect(push).not.toHaveBeenCalled()
  })

  it('explica el 404 con salida a la lista', async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { status: 404 } })
    const w = montar()
    await flushPromises()

    expect(w.find('.form-vacio__titulo').text()).toBe('Personaje no encontrado')
    expect(w.find('form').exists()).toBe(false)
  })

  it('explica el fallo de red y permite reintentar', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('offline'))
    const w = montar()
    await flushPromises()

    const alerta = w.find('[role="alert"]')
    expect(alerta.text()).toContain('No pudimos cargar el personaje')

    await alerta.findAll('button').find((b) => b.text() === 'Reintentar')!.trigger('click')
    await flushPromises()

    expect(w.find('#nombre').exists()).toBe(true)
    expect((w.find('#nombre').element as HTMLInputElement).value).toBe('Kaelen el Errante')
  })
})

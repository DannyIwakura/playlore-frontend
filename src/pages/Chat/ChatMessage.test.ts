import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatMessage from './ChatMessage.vue'

const MSG = {
  id: 5,
  personajeId: 12,
  emisorId: 12,
  personajeNombre: 'Kaelen el Errante',
  personajeAvatar: null,
  contenido: 'Hola a todos',
  fechaEnvio: '2026-11-17T08:00:00.000Z',
  eliminado: false,
  editado: false,
}

let wrapper: ReturnType<typeof mount> | null = null

function montar(props: Record<string, unknown> = {}) {
  wrapper = mount(ChatMessage, {
    props: { msg: { ...MSG }, esMio: false, ...props },
    global: {
      directives: {
        sanitize: (el: HTMLElement, binding: { value: unknown }) => {
          el.innerHTML = String(binding.value)
        },
      },
    },
  })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('ChatMessage', () => {
  it('marca los mensajes propios y ajenos con su variante de burbuja', () => {
    const mio = montar({ esMio: true, showHeader: true })
    expect(mio.find('.msg-row--mio').exists()).toBe(true)
    expect(mio.find('.msg-burbuja--mio').exists()).toBe(true)
    expect(mio.find('.msg-burbuja--otro').exists()).toBe(false)

    const otro = montar({ esMio: false, showHeader: true })
    expect(otro.find('.msg-row--mio').exists()).toBe(false)
    expect(otro.find('.msg-burbuja--otro').exists()).toBe(true)
  })

  it('convierte el avatar en un boton con nombre accesible', async () => {
    const w = montar()

    const avatar = w.find('.msg-avatar')
    expect(avatar.element.tagName).toBe('BUTTON')
    expect(avatar.attributes('type')).toBe('button')
    expect(avatar.attributes('aria-label')).toBe('Ver perfil de Kaelen el Errante')
    expect(avatar.find('img').attributes('alt')).toBe('')

    await avatar.trigger('click')
    expect(w.emitted('verPerfil')).toEqual([[12]])
  })

  it('el nombre del autor es un boton que abre su perfil', async () => {
    const w = montar({ showHeader: true })

    const autor = w.find('.msg-autor')
    expect(autor.element.tagName).toBe('BUTTON')
    expect(autor.text()).toBe('Kaelen el Errante')

    await autor.trigger('click')
    expect(w.emitted('verPerfil')).toEqual([[12]])
  })

  it('muestra la hora dentro de la burbuja y la marca si esta editado', () => {
    const w = montar({ msg: { ...MSG, editado: true } })

    expect(w.find('.msg-hora--suelta').text()).toContain('(editado)')
    expect(w.find('.msg-cabecera').exists()).toBe(false)
  })

  it('pinta el contenido sanitizado sin envolverlo en un parrafo', () => {
    const w = montar({ msg: { ...MSG, contenido: '<strong>Hola</strong> mundo' } })

    expect(w.find('.msg-contenido').html()).toContain('<strong>Hola</strong>')
  })

  it('cada accion tiene nombre accesible con autor y resumen', async () => {
    const w = montar({
      showHeader: true,
      mostrarAcciones: true,
      canDelete: true,
      canEditar: true,
      canDenunciar: true,
    })

    const botones = w.findAll('.msg-acciones button')
    expect(botones).toHaveLength(5)

    const etiquetas = botones.map((b) => b.attributes('aria-label'))
    expect(etiquetas).toContain('Responder a Kaelen el Errante: Hola a todos')
    expect(etiquetas).toContain('Copiar el mensaje de Kaelen el Errante: Hola a todos')
    expect(etiquetas).toContain('Editar el mensaje de Kaelen el Errante: Hola a todos')
    expect(etiquetas).toContain('Eliminar el mensaje de Kaelen el Errante: Hola a todos')
    expect(etiquetas).toContain('Denunciar el mensaje de Kaelen el Errante: Hola a todos')
    expect(botones.every((b) => b.find('i').attributes('aria-hidden') === 'true')).toBe(true)

    await botones[0].trigger('click')
    await botones[1].trigger('click')
    expect(w.emitted('responder')).toHaveLength(1)
    expect(w.emitted('copiar')).toHaveLength(1)
  })

  it('respeta los permisos: sin editar ni denunciar no pinta esos botones', () => {
    const w = montar({ mostrarAcciones: true, canDelete: true })

    const etiquetas = w.findAll('.msg-acciones button').map((b) => b.attributes('title'))
    expect(etiquetas).toEqual(['Responder', 'Copiar', 'Eliminar'])
  })

  it('eliminar emite el id del mensaje', async () => {
    const w = montar({ mostrarAcciones: true, canDelete: true })

    await w.findAll('.msg-acciones button')[2].trigger('click')
    expect(w.emitted('delete')).toEqual([[5]])
  })

  it('la cita de respuesta es un boton que lleva al mensaje original', async () => {
    const w = montar({
      mostrarAcciones: true,
      msg: { ...MSG, mensajePadreId: 3, mensajePadreAutor: 'Lysandra', mensajePadreContenido: 'Nos vemos allí' },
    })

    const cita = w.find('.msg-reply-preview')
    expect(cita.element.tagName).toBe('BUTTON')
    expect(cita.attributes('aria-label')).toBe('Ir al mensaje de Lysandra')
    expect(cita.text()).toContain('Respondiendo a @Lysandra')
    expect(cita.text()).toContain('Nos vemos allí')

    await cita.trigger('click')
    expect(w.emitted('scroll-a-mensaje')).toEqual([[3]])
  })

  it('un mensaje eliminado explica quien lo borro y no ofrece acciones', () => {
    const moderado = montar({
      mostrarAcciones: true,
      canDelete: true,
      msg: { ...MSG, eliminado: true, eliminadoPorModerador: true },
    })

    expect(moderado.find('.msg-eliminado').text()).toBe('El mensaje fue eliminado por moderación')
    expect(moderado.find('.msg-contenido').exists()).toBe(false)
    expect(moderado.find('.msg-acciones').exists()).toBe(false)

    const propio = montar({ mostrarAcciones: true, msg: { ...MSG, eliminado: true } })
    expect(propio.find('.msg-eliminado').text()).toBe('El mensaje fue eliminado por el usuario')
  })

  it('destacar marca la fila para el resaltado temporal', () => {
    const w = montar({ destacar: true })
    expect(w.find('.msg-row--destacado').exists()).toBe(true)
  })
})

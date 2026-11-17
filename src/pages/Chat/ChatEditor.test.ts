import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatEditor from './ChatEditor.vue'

const MIEMBROS = [
  { id: 1, personajeId: 12, personajeNombre: 'Kaelen el Errante', personajeAvatar: null },
  { id: 2, personajeId: 13, personajeNombre: 'Lysandra', personajeAvatar: '/uploads/lysandra.png' },
]

let wrapper: ReturnType<typeof mount> | null = null
let descriptorInnerText: PropertyDescriptor | undefined
let execCommandOriginal: typeof document.execCommand | undefined

// jsdom no implementa innerText y el editor lo usa para medir el contenido.
beforeAll(() => {
  descriptorInnerText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText')
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    configurable: true,
    get() {
      return this.textContent ?? ''
    },
    set(valor: string) {
      this.textContent = valor
    },
  })

  execCommandOriginal = document.execCommand
  document.execCommand = vi.fn()
})

afterAll(() => {
  if (descriptorInnerText) {
    Object.defineProperty(HTMLElement.prototype, 'innerText', descriptorInnerText)
  } else {
    delete (HTMLElement.prototype as { innerText?: unknown }).innerText
  }
  if (execCommandOriginal) document.execCommand = execCommandOriginal
})

function montar(props: Record<string, unknown> = {}) {
  wrapper = mount(ChatEditor, {
    props: { miembrosOnline: MIEMBROS, ...props },
    attachTo: document.body,
  })
  return wrapper
}

function escribir(w: ReturnType<typeof mount>, texto: string) {
  const editor = w.find('.chat-editor')
  editor.element.innerHTML = texto
  return editor.trigger('input')
}

function botonToolbar(w: ReturnType<typeof mount>, etiqueta: string) {
  const boton = w.findAll('.editor-toolbar__btn').find((b) => b.attributes('aria-label') === etiqueta)
  if (!boton) throw new Error(`No hay boton de toolbar con etiqueta ${etiqueta}`)
  return boton
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  window.getSelection()?.removeAllRanges()
  vi.mocked(document.execCommand).mockClear()
})

describe('ChatEditor', () => {
  it('la barra de formato se anuncia como toolbar y cada boton tiene nombre', () => {
    const w = montar()

    const toolbar = w.find('[role="toolbar"]')
    expect(toolbar.attributes('aria-label')).toBe('Formato del mensaje')

    const botones = w.findAll('.editor-toolbar__btn')
    expect(botones.length).toBeGreaterThanOrEqual(14)
    expect(botones.every((b) => !!b.attributes('aria-label'))).toBe(true)
    expect(botones.every((b) => b.attributes('type') === 'button')).toBe(true)
    expect(w.findAll('.editor-toolbar__separador').every((s) => s.attributes('role') === 'separator')).toBe(true)

    const iconos = w.findAll('.editor-toolbar__btn i')
    expect(iconos.length).toBeGreaterThan(0)
    expect(iconos.every((i) => i.attributes('aria-hidden') === 'true')).toBe(true)
  })

  it('el campo es un textbox multilinea etiquetado y con ayuda de teclado', () => {
    const w = montar()

    const editor = w.find('.chat-editor')
    expect(editor.attributes('contenteditable')).toBe('true')
    expect(editor.attributes('role')).toBe('textbox')
    expect(editor.attributes('aria-multiline')).toBe('true')
    expect(editor.attributes('aria-label')).toBe('Escribe un mensaje')
    expect(editor.attributes('aria-describedby')).toBe('editor-ayuda-teclado')
    expect(w.find('#editor-ayuda-teclado').text()).toContain('Mayús+Enter')
  })

  it('el boton de enviar explica su estado y se desactiva con el editor vacio', async () => {
    const w = montar()

    const enviar = w.find('.editor-enviar')
    expect(enviar.attributes('aria-label')).toBe('Enviar mensaje')
    expect(enviar.attributes('disabled')).toBeDefined()

    await escribir(w, 'Hola')
    expect(w.find('.editor-enviar').attributes('disabled')).toBeUndefined()
    expect(w.find('.editor-enviar i').attributes('aria-hidden')).toBe('true')

    await w.setProps({ sending: true })
    expect(w.find('.editor-enviar').attributes('aria-label')).toBe('Enviando mensaje')
    expect(w.find('.editor-enviar').attributes('disabled')).toBeDefined()
  })

  it('envia el contenido al hacer submit y deja el editor limpio', async () => {
    const w = montar()
    await escribir(w, 'Hola a todos')

    await w.find('.editor-form').trigger('submit')

    expect(w.emitted('send')).toEqual([['Hola a todos']])
    expect(w.find('.chat-editor').element.innerHTML).toBe('')
    expect(w.find('.editor-contador').text()).toBe('0/2000')
  })

  it('Enter envia y Mayus+Enter no envia', async () => {
    const w = montar()
    await escribir(w, 'Primera linea')

    await w.find('.chat-editor').trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(w.emitted('send')).toBeUndefined()

    await w.find('.chat-editor').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('send')).toEqual([['Primera linea']])
  })

  it('no envia texto vacio', async () => {
    const w = montar()
    await w.find('.editor-form').trigger('submit')
    expect(w.emitted('send')).toBeUndefined()
  })

  it('muestra el contador y lo marca al acercarse al limite', async () => {
    const w = montar()
    await escribir(w, 'Hola')
    expect(w.find('.editor-contador').text()).toBe('4/2000')
    expect(w.find('.editor-contador').classes()).not.toContain('editor-contador--aviso')

    await escribir(w, 'a'.repeat(1850))
    expect(w.find('.editor-contador').text()).toBe('1850/2000')
    expect(w.find('.editor-contador').classes()).toContain('editor-contador--aviso')
  })

  it('el aviso de respuesta nombra al autor y permite cancelar', async () => {
    const w = montar({
      mensajeEnRespuesta: {
        personajeNombre: 'Lysandra',
        contenido: 'Nos vemos en la taberna al anochecer',
      },
    })

    const aviso = w.find('.editor-aviso')
    expect(aviso.attributes('role')).toBe('status')
    expect(aviso.text()).toContain('Respondiendo a @Lysandra')
    expect(aviso.text()).toContain('Nos vemos en la taberna')

    const cerrar = w.find('.editor-aviso__cerrar')
    expect(cerrar.attributes('aria-label')).toBe('Cancelar respuesta')
    await cerrar.trigger('click')
    expect(w.emitted('cancelar-respuesta')).toHaveLength(1)
  })

  it('el aviso de edicion tiene su propio nombre accesible', async () => {
    const w = montar({ modoEdicion: { id: 5 } })

    expect(w.find('.editor-aviso').text()).toContain('Editando mensaje')
    const cerrar = w.find('.editor-aviso__cerrar')
    expect(cerrar.attributes('aria-label')).toBe('Cancelar edición')

    await cerrar.trigger('click')
    expect(w.emitted('cancelar-edicion')).toHaveLength(1)
    expect(w.emitted('cancelar-respuesta')).toBeUndefined()
  })

  it('abre y cierra el selector de emojis anunciando su estado', async () => {
    const w = montar()
    const emojis = botonToolbar(w, 'Insertar emoji')

    expect(emojis.attributes('aria-controls')).toBe('editor-picker-emojis')
    expect(emojis.attributes('aria-expanded')).toBe('false')

    await emojis.trigger('click')
    expect(botonToolbar(w, 'Insertar emoji').attributes('aria-expanded')).toBe('true')
    expect(w.find('#editor-picker-emojis').exists()).toBe(true)

    await botonToolbar(w, 'Insertar emoji').trigger('click')
    expect(w.find('#editor-picker-emojis').exists()).toBe(false)
  })

  it('las categorias de emojis marcan la activa y los emojis se insertan', async () => {
    const w = montar()
    await botonToolbar(w, 'Insertar emoji').trigger('click')

    const categorias = w.findAll('.editor-picker__categoria')
    expect(categorias.length).toBeGreaterThan(1)
    expect(categorias[0].attributes('aria-pressed')).toBe('true')

    await categorias[1].trigger('click')
    expect(w.findAll('.editor-picker__categoria')[1].attributes('aria-pressed')).toBe('true')

    const emoji = w.findAll('.editor-emoji')[0]
    expect(emoji.attributes('aria-label')).toContain('Insertar emoji')
    await emoji.trigger('click')

    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, emoji.text())
    expect(w.find('#editor-picker-emojis').exists()).toBe(false)
  })

  it('el selector de dados etiqueta la cantidad y anuncia cada dado', async () => {
    const w = montar()
    await botonToolbar(w, 'Insertar dados').trigger('click')

    expect(w.find('#editor-picker-dados').exists()).toBe(true)
    expect(w.find('label[for="editor-dados-cantidad"]').text()).toBe('Cantidad')

    const select = w.find('#editor-dados-cantidad')
    await select.setValue('2')

    const d20 = w.findAll('.editor-dado').find((b) => b.text() === 'd20')
    expect(d20?.attributes('aria-label')).toBe('Insertar 2d20')

    await d20!.trigger('click')
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, ' 🎲 2d20 ')
    expect(w.find('#editor-picker-dados').exists()).toBe(false)
  })

  it('el selector de menciones lista miembros y los inserta', async () => {
    const w = montar()
    await botonToolbar(w, 'Mencionar personaje').trigger('click')

    const panel = w.find('#editor-picker-menciones')
    expect(panel.exists()).toBe(true)
    const opciones = w.findAll('.editor-mencion')
    expect(opciones).toHaveLength(2)
    expect(opciones[1].text()).toContain('Lysandra')

    await opciones[1].trigger('click')
    expect(w.find('#editor-picker-menciones').exists()).toBe(false)
    expect(w.find('.chat-editor').element.textContent).toContain('@Lysandra ')
  })

  it('el selector de menciones explica cuando no hay miembros', async () => {
    const w = montar({ miembrosOnline: [] })
    await botonToolbar(w, 'Mencionar personaje').trigger('click')

    expect(w.find('.editor-picker__vacio').text()).toBe('No hay miembros disponibles')
    expect(w.findAll('.editor-mencion')).toHaveLength(0)
  })

  it('abre el modal de enlace como dialogo compartido y permite cerrarlo', async () => {
    const w = montar()
    await botonToolbar(w, 'Insertar enlace').trigger('click')

    const dialogo = w.find('[role="dialog"]')
    expect(dialogo.exists()).toBe(true)
    expect(dialogo.attributes('aria-modal')).toBe('true')
    expect(w.find('#enlace-url').exists()).toBe(true)
    expect(w.find('label[for="enlace-url"]').text()).toBe('URL')
    expect(w.find('label[for="enlace-texto"]').text()).toBe('Texto del enlace')

    await w.find('[role="dialog"] .btn-close').trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
  })

  it('abre la ayuda del editor en el modal compartido con todos los atajos', async () => {
    const w = montar()
    await botonToolbar(w, 'Ayuda del editor').trigger('click')

    const dialogo = w.find('[role="dialog"]')
    expect(dialogo.exists()).toBe(true)
    expect(dialogo.text()).toContain('Ayuda del editor')
    expect(w.findAll('.editor-ayuda__item')).toHaveLength(13)
    expect(dialogo.text()).toContain('Limpiar formato')

    await w.find('[role="dialog"] .btn-close').trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
  })

  it('abrir la ayuda cierra los paneles abiertos', async () => {
    const w = montar()
    await botonToolbar(w, 'Insertar emoji').trigger('click')
    expect(w.find('#editor-picker-emojis').exists()).toBe(true)

    await botonToolbar(w, 'Ayuda del editor').trigger('click')
    expect(w.find('#editor-picker-emojis').exists()).toBe(false)
    expect(w.find('[role="dialog"]').exists()).toBe(true)
  })
})

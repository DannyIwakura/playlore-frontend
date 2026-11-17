<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ModalFormulario from '../../components/ModalFormulario.vue'
import { EMOJI_CATEGORIES, getRecentEmojis, addRecentEmoji } from './emojiData'
import { avatarUrl, truncarTexto } from './chatUtils'

const props = defineProps<{
  miembrosOnline: any[]
  sending?: boolean
  mensajeEnRespuesta?: any | null
  modoEdicion?: any | null
}>()

const emit = defineEmits<{
  send: [texto: string]
  'cancelar-respuesta': []
  'cancelar-edicion': []
}>()

const editorRef = ref<HTMLElement | null>(null)
const nuevoMensaje = ref('')

const mostrarEmojiPicker = ref(false)
const categoriaEmojiActiva = ref(0)
const emojiCategories = computed(() => {
  const recent = getRecentEmojis()
  const cats = recent.length > 0
    ? [{ name: 'Usados recientemente', emojis: recent }, ...EMOJI_CATEGORIES]
    : EMOJI_CATEGORIES
  return cats
})

const mostrarDicePicker = ref(false)
const diceCount = ref(1)
const diceQuantityOptions = [1, 2, 3, 4, 5]
const DICE_TYPES = [
  { label: 'd4', max: 4, icon: 'd4' },
  { label: 'd6', max: 6, icon: 'd6' },
  { label: 'd8', max: 8, icon: 'd8' },
  { label: 'd10', max: 10, icon: 'd10' },
  { label: 'd12', max: 12, icon: 'd12' },
  { label: 'd20', max: 20, icon: 'd20' },
  { label: 'd100', max: 100, icon: 'd100' },
]

const mostrarMentionPicker = ref(false)
const mentionSearch = ref('')
const mentionHighlightIndex = ref(-1)

const mostrarAyudaEditor = ref(false)

const filteredMentions = computed(() => {
  const list = props.miembrosOnline
  if (!mentionSearch.value) return list
  const s = mentionSearch.value.toLowerCase()
  return list.filter((m: any) => m.personajeNombre.toLowerCase().includes(s))
})

const charsRestantes = computed(() => {
  const len = nuevoMensaje.value?.length ?? 0
  const max = 2000
  return { usado: len, max, porcentaje: Math.min(100, (len / max) * 100) }
})

const contadorEnAviso = computed(() => charsRestantes.value.usado > charsRestantes.value.max * 0.9)

const FORMAT_TAGS: Record<string, string> = {
  bold: 'b',
  italic: 'i',
  strikeThrough: 's',
  underline: 'u',
  blockquote: 'blockquote',
  h3: 'h3',
  h4: 'h4',
}

function wrapSelection(tag: string) {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || sel.isCollapsed) return
  const range = sel.getRangeAt(0)
  const wrapper = document.createElement(tag)
  try {
    range.surroundContents(wrapper)
  } catch {
    const fragment = range.extractContents()
    wrapper.appendChild(fragment)
    range.insertNode(wrapper)
  }
  sel.removeAllRanges()
}

function execFormat(command: string) {
  if (command === 'spoiler') {
    const el = editorRef.value
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const details = document.createElement('details')
    const summary = document.createElement('summary')
    summary.textContent = 'Spoiler'
    details.appendChild(summary)
    try {
      range.surroundContents(details)
    } catch {
      const fragment = range.extractContents()
      details.appendChild(fragment)
      range.insertNode(details)
    }
    sel.removeAllRanges()
    return
  }
  const tag = FORMAT_TAGS[command]
  if (!tag) return
  wrapSelection(tag)
}

function clearFormat() {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || sel.isCollapsed) return
  const range = sel.getRangeAt(0)
  const text = range.extractContents()
  const textNode = document.createTextNode(text.textContent || '')
  range.insertNode(textNode)
  sel.removeAllRanges()
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const mostrarModalEnlace = ref(false)
const urlEnlace = ref('https://')
const textoEnlace = ref('')
let rangoEnlaceGuardado: Range | null = null

function insertLink() {
  const sel = window.getSelection()
  rangoEnlaceGuardado = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
  textoEnlace.value = sel?.toString().trim() ?? ''
  urlEnlace.value = 'https://'
  mostrarModalEnlace.value = true
}

function confirmarEnlace() {
  const url = urlEnlace.value.trim()
  const linkText = textoEnlace.value.trim() || url
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  sel?.removeAllRanges()
  if (rangoEnlaceGuardado && rangoEnlaceGuardado.commonAncestorContainer) {
    sel?.addRange(rangoEnlaceGuardado)
  }
  const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : document.createRange()
  range.deleteContents()
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.textContent = linkText
  range.insertNode(anchor)
  sel?.removeAllRanges()
  rangoEnlaceGuardado = null
  mostrarModalEnlace.value = false
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function processDiceInMessage(html: string): string {
  return html.replace(/🎲\s*(\d+)d(\d+)/g, (_match, count, sides) => {
    const c = parseInt(count)
    const s = parseInt(sides)
    const rolls: number[] = []
    for (let i = 0; i < c; i++) {
      rolls.push(Math.floor(Math.random() * s) + 1)
    }
    const total = rolls.reduce((a, b) => a + b, 0)
    if (c === 1) {
      return `🎲 ${c}d${s} = ${total}`
    }
    return `🎲 ${c}d${s} = ${total} (${rolls.join('+')})`
  })
}

function processMentionsInMessage(html: string): string {
  const members = [...props.miembrosOnline]
  if (members.length === 0) return html
  members.sort((a: any, b: any) => b.personajeNombre.length - a.personajeNombre.length)
  let result = html
  for (const m of members) {
    const escapedName = m.personajeNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|>|\\s)@${escapedName}(?=([.,!?;:\\s<]|$))`, 'g')
    result = result.replace(regex, `$1<a href="profile:${m.personajeId}">@${m.personajeNombre}</a>`)
  }
  return result
}

function obtenerContenidoEditor(): string {
  const el = editorRef.value
  if (!el) return ''
  let html = el.innerHTML
  html = html.replace(/<br>\s*$/, '')
  html = processDiceInMessage(html)
  html = processMentionsInMessage(html)
  return html === '<br>' ? '' : html
}

function limpiarEditor() {
  editorRef.value?.replaceChildren()
  nuevoMensaje.value = ''
}

function setContenido(html: string) {
  if (editorRef.value) {
    editorRef.value.innerHTML = html
    nuevoMensaje.value = editorRef.value.innerText || ''
  }
}

function enfocar() {
  editorRef.value?.focus()
}

defineExpose({ enfocar, limpiar: limpiarEditor, setContenido })

function getMentionSearch(): string {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return ''
  const node = sel.focusNode
  const offset = sel.focusOffset
  if (!node) return ''
  const text = node.textContent || ''
  const beforeCursor = text.slice(0, offset)
  const atIndex = beforeCursor.lastIndexOf('@')
  if (atIndex === -1) return ''
  return beforeCursor.slice(atIndex + 1)
}

function onEditorInput() {
  const el = editorRef.value
  if (!el) return
  nuevoMensaje.value = el.innerText || ''
  if (mostrarMentionPicker.value) {
    mentionSearch.value = getMentionSearch()
  }
  const max = 2000
  if (nuevoMensaje.value.length > max) {
    el.innerText = nuevoMensaje.value.slice(0, max)
    nuevoMensaje.value = nuevoMensaje.value.slice(0, max)
    const range = document.createRange()
    const sel = window.getSelection()
    if (el.lastChild) {
      range.setStartAfter(el.lastChild)
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }
}

function onEditorPaste(e: ClipboardEvent) {
  e.preventDefault()
  const el = editorRef.value
  if (!el) return
  const html = e.clipboardData?.getData('text/html')
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (html) {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    tmp.querySelectorAll('*').forEach(node => {
      const style = (node as HTMLElement).style
      style.removeProperty('color')
      style.removeProperty('background-color')
    })
    document.execCommand('insertHTML', false, tmp.innerHTML)
  } else if (text) {
    document.execCommand('insertText', false, text)
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function insertDice(diceType: typeof DICE_TYPES[0]) {
  const notation = `${diceCount.value}${diceType.label}`
  const text = ` 🎲 ${notation} `
  const el = editorRef.value
  if (!el) return
  el.focus()
  document.execCommand('insertText', false, text)
  mostrarDicePicker.value = false
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function insertMention(nombre: string) {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    const node = sel.focusNode
    const offset = sel.focusOffset
    if (node && node.textContent) {
      const text = node.textContent
      const beforeCursor = text.slice(0, offset)
      const atIndex = beforeCursor.lastIndexOf('@')
      if (atIndex !== -1) {
        range.setStart(node, atIndex)
        range.setEnd(node, offset)
      }
    }
    range.deleteContents()
    const textNode = document.createTextNode(`@${nombre} `)
    range.insertNode(textNode)
    range.setStartAfter(textNode)
    sel.removeAllRanges()
    sel.addRange(range)
  } else {
    document.execCommand('insertText', false, `@${nombre} `)
  }
  mostrarMentionPicker.value = false
  mentionSearch.value = ''
  mentionHighlightIndex.value = -1
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function insertEmoji(emoji: string) {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) {
      el.focus()
      const newRange = document.createRange()
      newRange.setStart(el, el.childNodes.length)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
    }
  }
  document.execCommand('insertText', false, emoji)
  addRecentEmoji(emoji)
  closeEmojiPicker()
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function toggleEmojiPicker() {
  mostrarEmojiPicker.value = !mostrarEmojiPicker.value
  if (mostrarEmojiPicker.value) {
    categoriaEmojiActiva.value = 0
    mostrarDicePicker.value = false
    mostrarMentionPicker.value = false
  }
}

function closeEmojiPicker() {
  mostrarEmojiPicker.value = false
}

function toggleDicePicker() {
  mostrarDicePicker.value = !mostrarDicePicker.value
  if (mostrarDicePicker.value) {
    diceCount.value = 1
    mostrarEmojiPicker.value = false
    mostrarMentionPicker.value = false
  }
}

function closeDicePicker() {
  mostrarDicePicker.value = false
}

function toggleMentionPicker() {
  mostrarMentionPicker.value = !mostrarMentionPicker.value
  if (mostrarMentionPicker.value) {
    mentionSearch.value = ''
    mentionHighlightIndex.value = 0
    mostrarEmojiPicker.value = false
    mostrarDicePicker.value = false
  }
}

function closeMentionPicker() {
  mostrarMentionPicker.value = false
  mentionSearch.value = ''
  mentionHighlightIndex.value = -1
}

function cerrarPickers() {
  closeEmojiPicker()
  closeDicePicker()
  closeMentionPicker()
}

function toggleAyudaEditor() {
  mostrarAyudaEditor.value = !mostrarAyudaEditor.value
  if (mostrarAyudaEditor.value) cerrarPickers()
}

// Cada boton declara su nombre accesible y, si abre un panel, el id que controla.
// Se usa mousedown.prevent para no perder la seleccion del editor y click para
// que el teclado (Enter/Espacio) ejecute la misma accion.
type BotonToolbar = {
  id: string
  etiqueta: string
  icono?: string
  texto?: string
  glifo?: string
  accion: () => void
  controla?: string
  expandido?: () => boolean
}

const GRUPOS_TOOLBAR: BotonToolbar[][] = [
  [
    { id: 'negrita', etiqueta: 'Negrita', texto: 'B', glifo: 'negrita', accion: () => execFormat('bold') },
    { id: 'cursiva', etiqueta: 'Cursiva', texto: 'I', glifo: 'cursiva', accion: () => execFormat('italic') },
    { id: 'tachado', etiqueta: 'Tachado', texto: 'S', glifo: 'tachado', accion: () => execFormat('strikeThrough') },
    { id: 'subrayado', etiqueta: 'Subrayado', texto: 'U', glifo: 'subrayado', accion: () => execFormat('underline') },
  ],
  [
    { id: 'cita', etiqueta: 'Cita en bloque', icono: 'bi-quote', accion: () => execFormat('blockquote') },
    { id: 'h3', etiqueta: 'Encabezado grande', texto: 'H3', glifo: 'titulo', accion: () => execFormat('h3') },
    { id: 'h4', etiqueta: 'Encabezado pequeño', texto: 'H4', glifo: 'titulo', accion: () => execFormat('h4') },
  ],
  [
    {
      id: 'dados',
      etiqueta: 'Insertar dados',
      icono: 'bi-dice-6',
      accion: toggleDicePicker,
      controla: 'editor-picker-dados',
      expandido: () => mostrarDicePicker.value,
    },
    {
      id: 'mencion',
      etiqueta: 'Mencionar personaje',
      icono: 'bi-at',
      accion: toggleMentionPicker,
      controla: 'editor-picker-menciones',
      expandido: () => mostrarMentionPicker.value,
    },
    { id: 'enlace', etiqueta: 'Insertar enlace', icono: 'bi-link-45deg', accion: insertLink },
    { id: 'spoiler', etiqueta: 'Spoiler', icono: 'bi-eye-slash', accion: () => execFormat('spoiler') },
    { id: 'limpiar', etiqueta: 'Limpiar formato', icono: 'bi-eraser', accion: clearFormat },
  ],
  [
    {
      id: 'emojis',
      etiqueta: 'Insertar emoji',
      texto: '😊',
      glifo: 'emoji',
      accion: toggleEmojiPicker,
      controla: 'editor-picker-emojis',
      expandido: () => mostrarEmojiPicker.value,
    },
  ],
  [
    {
      id: 'ayuda',
      etiqueta: 'Ayuda del editor',
      texto: '?',
      glifo: 'ayuda',
      accion: toggleAyudaEditor,
    },
  ],
]

function enviar() {
  const texto = obtenerContenidoEditor()
  if (!texto || props.sending) return
  limpiarEditor()
  emit('send', texto)
}

function handleEditorKeydown(e: KeyboardEvent) {
  if (mostrarMentionPicker.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const len = filteredMentions.value.length
      if (len > 0) {
        mentionHighlightIndex.value = (mentionHighlightIndex.value + 1) % len
      }
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const len = filteredMentions.value.length
      if (len > 0) {
        mentionHighlightIndex.value = (mentionHighlightIndex.value - 1 + len) % len
      }
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const idx = mentionHighlightIndex.value >= 0 ? mentionHighlightIndex.value : 0
      if (idx < filteredMentions.value.length) {
        insertMention(filteredMentions.value[idx].personajeNombre)
      }
      return
    }
    if (e.key === 'Escape') {
      mostrarMentionPicker.value = false
      mentionSearch.value = ''
      return
    }
    if (e.key === 'Backspace') {
      setTimeout(() => {
        mentionSearch.value = getMentionSearch()
        if (!mentionSearch.value && !getMentionSearch()) {
          mostrarMentionPicker.value = false
        }
      }, 0)
    }
    return
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    enviar()
    return
  }
  if (e.key === '@') {
    setTimeout(() => {
      mentionSearch.value = ''
      mentionHighlightIndex.value = 0
      mostrarMentionPicker.value = true
      mostrarEmojiPicker.value = false
      mostrarDicePicker.value = false
    }, 0)
    return
  }
}

function handleOverlayClick(pickerType: 'emoji' | 'dice' | 'mention') {
  if (pickerType === 'emoji') closeEmojiPicker()
  if (pickerType === 'dice') closeDicePicker()
  if (pickerType === 'mention') closeMentionPicker()
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (mostrarAyudaEditor.value) mostrarAyudaEditor.value = false
  if (mostrarModalEnlace.value) mostrarModalEnlace.value = false
  if (mostrarEmojiPicker.value) closeEmojiPicker()
  if (mostrarDicePicker.value) closeDicePicker()
  if (mostrarMentionPicker.value) closeMentionPicker()
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('pl:modal-abierto', cerrarPickers)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('pl:modal-abierto', cerrarPickers)
})
</script>

<template>
  <div class="chat-editor-zona">
    <div v-if="modoEdicion || mensajeEnRespuesta" class="editor-aviso" role="status">
      <i
        class="bi editor-aviso__icono"
        :class="modoEdicion ? 'bi-pencil' : 'bi-reply'"
        aria-hidden="true"
      ></i>
      <div class="editor-aviso__texto">
        <template v-if="modoEdicion">
          <strong>Editando mensaje</strong>
        </template>
        <template v-else>
          <strong>Respondiendo a @{{ mensajeEnRespuesta.personajeNombre }}</strong>
          <span class="editor-aviso__cita"> — {{ truncarTexto(mensajeEnRespuesta.contenido, 80) }}</span>
        </template>
      </div>
      <button
        type="button"
        class="editor-aviso__cerrar"
        :aria-label="modoEdicion ? 'Cancelar edición' : 'Cancelar respuesta'"
        @click="modoEdicion ? emit('cancelar-edicion') : emit('cancelar-respuesta')"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </div>

    <div class="editor-anclaje">
      <div class="editor-toolbar" role="toolbar" aria-label="Formato del mensaje">
        <template v-for="(grupo, gi) in GRUPOS_TOOLBAR" :key="gi">
          <span
            v-if="gi > 0"
            class="editor-toolbar__separador"
            role="separator"
            aria-orientation="vertical"
          ></span>
          <button
            v-for="boton in grupo"
            :key="boton.id"
            type="button"
            class="editor-toolbar__btn"
            :class="{ 'editor-toolbar__btn--activo': boton.expandido?.() }"
            :title="boton.etiqueta"
            :aria-label="boton.etiqueta"
            :aria-controls="boton.controla"
            :aria-expanded="boton.expandido ? String(boton.expandido()) : undefined"
            @mousedown.prevent
            @click="boton.accion()"
          >
            <i v-if="boton.icono" class="bi" :class="boton.icono" aria-hidden="true"></i>
            <span v-else class="editor-toolbar__glifo" :class="`editor-toolbar__glifo--${boton.glifo}`">
              {{ boton.texto }}
            </span>
          </button>
        </template>
      </div>

      <!-- Emoji picker -->
      <div
        v-if="mostrarEmojiPicker"
        id="editor-picker-emojis"
        class="editor-picker"
        role="group"
        aria-label="Selector de emojis"
      >
        <div class="editor-picker__categorias">
          <button
            v-for="(cat, ci) in emojiCategories"
            :key="ci"
            type="button"
            class="editor-picker__categoria"
            :aria-pressed="categoriaEmojiActiva === ci"
            @mousedown.prevent
            @click="categoriaEmojiActiva = ci"
          >
            {{ cat.name }}
          </button>
        </div>
        <div class="editor-picker__grid">
          <button
            v-for="(emoji, ei) in emojiCategories[categoriaEmojiActiva]?.emojis"
            :key="ei"
            type="button"
            class="editor-emoji"
            :title="emoji"
            :aria-label="`Insertar emoji ${emoji}`"
            @mousedown.prevent
            @click="insertEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <!-- Dice picker -->
      <div
        v-if="mostrarDicePicker"
        id="editor-picker-dados"
        class="editor-picker editor-picker--dados"
        role="group"
        aria-label="Insertar dados"
      >
        <div class="editor-dados__fila">
          <label class="editor-picker__label" for="editor-dados-cantidad">Cantidad</label>
          <select id="editor-dados-cantidad" v-model="diceCount" class="form-select form-select-sm editor-dados__select">
            <option v-for="n in diceQuantityOptions" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div class="editor-dados__tipos">
          <button
            v-for="dt in DICE_TYPES"
            :key="dt.label"
            type="button"
            class="editor-dado"
            :aria-label="`Insertar ${diceCount}${dt.label}`"
            @mousedown.prevent
            @click="insertDice(dt)"
          >
            {{ dt.label }}
          </button>
        </div>
      </div>

      <!-- Mention picker -->
      <div
        v-if="mostrarMentionPicker"
        id="editor-picker-menciones"
        class="editor-picker editor-picker--menciones"
        role="group"
        aria-label="Mencionar personaje"
      >
        <p v-if="filteredMentions.length === 0" class="editor-picker__vacio">
          No hay miembros disponibles
        </p>
        <button
          v-for="(m, mi) in filteredMentions"
          :key="m.id"
          type="button"
          class="editor-mencion"
          :class="{ 'editor-mencion--activa': mi === mentionHighlightIndex }"
          @mousedown.prevent
          @click="insertMention(m.personajeNombre)"
          @mouseenter="mentionHighlightIndex = mi"
        >
          <img :src="avatarUrl(m.personajeAvatar)" alt="" width="22" height="22" />
          <span class="editor-mencion__nombre">{{ m.personajeNombre }}</span>
        </button>
      </div>

      <form class="editor-form" @submit.prevent="enviar">
        <div class="editor-campo">
          <div
            ref="editorRef"
            class="chat-editor"
            contenteditable="true"
            role="textbox"
            aria-multiline="true"
            aria-label="Escribe un mensaje"
            aria-describedby="editor-ayuda-teclado"
            data-placeholder="Escribe un mensaje…"
            @keydown="handleEditorKeydown"
            @input="onEditorInput"
            @paste="onEditorPaste"
          ></div>
          <p id="editor-ayuda-teclado" class="visually-hidden">
            Enter envía el mensaje y Mayús+Enter añade una línea nueva.
          </p>
        </div>
        <button
          type="submit"
          class="editor-enviar"
          :disabled="!nuevoMensaje.trim() || sending"
          :aria-label="sending ? 'Enviando mensaje' : 'Enviar mensaje'"
        >
          <span v-if="sending" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <i v-else class="bi bi-send" aria-hidden="true"></i>
        </button>
      </form>

      <div class="editor-contador" :class="{ 'editor-contador--aviso': contadorEnAviso }">
        {{ charsRestantes.usado }}/{{ charsRestantes.max }}
      </div>

      <!-- Capa para cerrar los paneles al hacer clic fuera -->
      <div
        v-if="mostrarEmojiPicker"
        class="editor-overlay"
        aria-hidden="true"
        @click="handleOverlayClick('emoji')"
        @contextmenu.prevent="handleOverlayClick('emoji')"
      ></div>
      <div
        v-if="mostrarDicePicker"
        class="editor-overlay"
        aria-hidden="true"
        @click="handleOverlayClick('dice')"
        @contextmenu.prevent="handleOverlayClick('dice')"
      ></div>
      <div
        v-if="mostrarMentionPicker"
        class="editor-overlay"
        aria-hidden="true"
        @click="handleOverlayClick('mention')"
        @contextmenu.prevent="handleOverlayClick('mention')"
      ></div>
    </div>

    <ModalFormulario
      v-if="mostrarAyudaEditor"
      titulo="Ayuda del editor"
      ancho="md"
      @cerrar="mostrarAyudaEditor = false"
    >
      <div class="editor-ayuda">
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><strong>B</strong></span><span>Negrita</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><em>I</em></span><span>Cursiva</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><s>S</s></span><span>Tachado</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><u>U</u></span><span>Subrayado</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><i class="bi bi-quote" aria-hidden="true"></i></span><span>Cita en bloque</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><strong>H3</strong></span><span>Encabezado grande</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><strong>H4</strong></span><span>Encabezado pequeño</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><i class="bi bi-dice-6" aria-hidden="true"></i></span><span>Insertar dados (se lanzan al enviar)</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><i class="bi bi-at" aria-hidden="true"></i></span><span>Mencionar personaje: escribe <code>@</code> en el editor o usa este botón; navega con <kbd>↑</kbd> <kbd>↓</kbd> y pulsa <kbd>Tab</kbd> o <kbd>Enter</kbd></span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><i class="bi bi-link-45deg" aria-hidden="true"></i></span><span>Insertar enlace</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><i class="bi bi-eye-slash" aria-hidden="true"></i></span><span>Spoiler: texto oculto (clic para revelar)</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla"><i class="bi bi-eraser" aria-hidden="true"></i></span><span>Limpiar formato</span></div>
        <div class="editor-ayuda__item"><span class="editor-ayuda__tecla">😊</span><span>Emojis: selecciona uno para insertarlo</span></div>
      </div>
      <p class="editor-ayuda__nota">
        También puedes usar <kbd>Tab</kbd> para completar una mención si hay resultados disponibles.
      </p>
    </ModalFormulario>

    <ModalFormulario
      v-if="mostrarModalEnlace"
      titulo="Insertar enlace"
      @cerrar="mostrarModalEnlace = false"
    >
      <form @submit.prevent="confirmarEnlace">
        <div class="editor-enlace__campo">
          <label class="form-label" for="enlace-url">URL</label>
          <input
            id="enlace-url"
            v-model="urlEnlace"
            class="form-control"
            type="text"
            inputmode="url"
            placeholder="https://..."
          />
        </div>
        <div class="editor-enlace__campo">
          <label class="form-label" for="enlace-texto">Texto del enlace</label>
          <input
            id="enlace-texto"
            v-model="textoEnlace"
            class="form-control"
            type="text"
            placeholder="Texto visible"
          />
        </div>
        <div class="editor-enlace__acciones">
          <button type="button" class="btn btn-outline-secondary" @click="mostrarModalEnlace = false">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="!urlEnlace.trim()">
            Insertar enlace
          </button>
        </div>
      </form>
    </ModalFormulario>
  </div>
</template>

<style scoped>
.chat-editor-zona {
  padding: 0.6rem 0.8rem 0.55rem;
  border-top: 1px solid var(--pl-border);
  background: var(--pl-surface);
}

/* ---- Aviso de respuesta o edicion ---- */

.editor-aviso {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(var(--pl-primary-rgb), 0.22);
  border-radius: var(--pl-radius-md);
  background: rgba(var(--pl-primary-rgb), 0.07);
  color: var(--pl-primary-ink);
}

.editor-aviso__icono {
  flex-shrink: 0;
  font-size: 0.9rem;
}

.editor-aviso__texto {
  min-width: 0;
  flex: 1;
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-aviso__cita {
  color: var(--pl-muted);
}

.editor-aviso__cerrar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--pl-radius-sm);
  background: transparent;
  color: inherit;
  font-size: 0.8rem;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard);
}

.editor-aviso__cerrar:hover {
  background: rgba(var(--pl-primary-rgb), 0.12);
}

/* ---- Barra de formato ---- */

.editor-anclaje {
  position: relative;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding-bottom: 0.35rem;
}

.editor-toolbar__separador {
  width: 1px;
  height: 18px;
  margin: 0 0.3rem;
  background: var(--pl-border);
}

.editor-toolbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 0.35rem;
  border: 1px solid transparent;
  border-radius: var(--pl-radius-sm);
  background: transparent;
  color: var(--pl-muted);
  font-size: 0.85rem;
  line-height: 1;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard);
}

.editor-toolbar__btn:hover {
  border-color: var(--pl-border);
  background: var(--pl-surface-soft);
  color: var(--pl-ink);
}

.editor-toolbar__btn--activo,
.editor-toolbar__btn[aria-expanded='true'] {
  border-color: rgba(var(--pl-primary-rgb), 0.3);
  background: rgba(var(--pl-primary-rgb), 0.12);
  color: var(--pl-primary-ink);
}

.editor-toolbar__btn:focus-visible,
.editor-aviso__cerrar:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}

.editor-toolbar__glifo--negrita,
.editor-toolbar__glifo--titulo,
.editor-toolbar__glifo--ayuda {
  font-weight: 800;
}

.editor-toolbar__glifo--cursiva {
  font-style: italic;
  font-weight: 700;
}

.editor-toolbar__glifo--tachado {
  text-decoration: line-through;
  font-weight: 700;
}

.editor-toolbar__glifo--subrayado {
  text-decoration: underline;
  font-weight: 700;
}

.editor-toolbar__glifo--emoji {
  font-size: 1rem;
  line-height: 1;
}

@media (pointer: coarse) {
  .editor-toolbar__btn {
    min-width: 44px;
    height: 44px;
    font-size: 1rem;
  }

  .editor-aviso__cerrar {
    width: 44px;
    height: 44px;
  }
}

/* ---- Paneles de emojis, dados y menciones ---- */

.editor-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  z-index: 1040;
  max-height: 55vh;
  overflow-y: auto;
  padding: 0.6rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-lg);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-lg);
}

.editor-picker--dados,
.editor-picker--menciones {
  max-height: 320px;
}

.editor-picker__categorias {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.editor-picker__categoria {
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--pl-border);
  border-radius: 999px;
  background: var(--pl-surface);
  color: var(--pl-muted);
  font-size: 0.75rem;
  font-weight: 600;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard);
}

.editor-picker__categoria:hover {
  border-color: rgba(var(--pl-primary-rgb), 0.35);
  color: var(--pl-primary-ink);
}

.editor-picker__categoria[aria-pressed='true'] {
  border-color: var(--pl-primary-strong);
  background: var(--pl-primary-strong);
  color: #fff;
}

.editor-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 2px;
}

.editor-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: var(--pl-radius-sm);
  background: transparent;
  font-size: 1.15rem;
  line-height: 1;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard);
}

.editor-emoji:hover {
  background: var(--pl-surface-soft);
}

.editor-picker__vacio {
  margin: 0;
  padding: 0.75rem 0;
  color: var(--pl-muted);
  font-size: 0.82rem;
  text-align: center;
}

.editor-dados__fila {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.editor-picker__label {
  margin: 0;
  color: var(--pl-muted);
  font-size: 0.78rem;
}

.editor-dados__select {
  width: auto;
}

.editor-dados__tipos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.editor-dado {
  min-width: 44px;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-sm);
  background: var(--pl-surface);
  color: var(--pl-ink);
  font-size: 0.8rem;
  font-weight: 600;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard);
}

.editor-dado:hover {
  border-color: var(--pl-primary);
  background: rgba(var(--pl-primary-rgb), 0.06);
  color: var(--pl-primary-ink);
}

.editor-mencion {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 0;
  border-radius: var(--pl-radius-sm);
  background: transparent;
  color: var(--pl-ink);
  font-size: 0.85rem;
  text-align: left;
}

.editor-mencion img {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--pl-surface-soft);
  object-fit: cover;
}

.editor-mencion__nombre {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-mencion:hover,
.editor-mencion--activa {
  background: var(--pl-surface-soft);
}

@media (pointer: coarse) {
  .editor-emoji {
    height: 44px;
  }

  .editor-mencion {
    min-height: 44px;
  }
}

/* ---- Campo y envio ---- */

.editor-form {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.editor-campo {
  min-width: 0;
  flex: 1;
}

.chat-editor {
  min-height: 42px;
  max-height: 180px;
  padding: 0.5rem 0.7rem;
  overflow-y: auto;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface-soft);
  color: var(--pl-ink);
  font-size: 0.92rem;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  transition: border-color var(--pl-duration-fast) var(--pl-ease-standard), background var(--pl-duration-fast) var(--pl-ease-standard);
}

.chat-editor:hover {
  border-color: #cfd4dc;
}

.chat-editor:focus {
  border-color: var(--pl-primary);
  background: var(--pl-surface);
  outline: 2px solid rgba(var(--pl-primary-rgb), 0.25);
  outline-offset: 1px;
}

.chat-editor:empty::before {
  content: attr(data-placeholder);
  color: var(--pl-muted);
  pointer-events: none;
}

.editor-enviar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: var(--pl-radius-md);
  background: var(--pl-primary-strong);
  color: #fff;
  font-size: 1rem;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), opacity var(--pl-duration-fast) var(--pl-ease-standard);
}

.editor-enviar:hover:not(:disabled) {
  background: var(--pl-primary-dark);
}

.editor-enviar:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 2px;
}

.editor-enviar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (pointer: coarse) {
  .editor-enviar {
    width: 44px;
    height: 44px;
  }

  .chat-editor {
    min-height: 44px;
  }
}

.editor-contador {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.15rem;
  color: var(--pl-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.editor-contador--aviso {
  color: var(--pl-danger-ink);
  font-weight: 700;
}

.editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 1030;
}

/* ---- Ayuda del editor ---- */

.editor-ayuda {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem 0.9rem;
}

.editor-ayuda__item {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
  font-size: 0.85rem;
}

.editor-ayuda__tecla {
  min-width: 32px;
  flex-shrink: 0;
  padding: 0.05rem 0.4rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-sm);
  background: var(--pl-surface-soft);
  font-size: 0.78rem;
  text-align: center;
}

.editor-ayuda__nota {
  margin: 0.9rem 0 0;
  color: var(--pl-muted);
  font-size: 0.8rem;
}

@media (max-width: 480px) {
  .editor-ayuda {
    grid-template-columns: 1fr;
  }
}

/* ---- Modal de enlace ---- */

.editor-enlace__campo {
  margin-bottom: 0.85rem;
}

.editor-enlace__campo .form-label {
  font-size: 0.82rem;
  font-weight: 600;
}

.editor-enlace__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.1rem;
}
</style>

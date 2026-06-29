<script setup lang="ts">
import { ref, computed } from 'vue'
import { EMOJI_CATEGORIES, getRecentEmojis, addRecentEmoji } from './emojiData'
import { avatarUrl } from './chatUtils'

const props = defineProps<{
  miembrosOnline: any[]
  sending?: boolean
}>()

const emit = defineEmits<{
  send: [texto: string]
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

function insertLink() {
  const sel = window.getSelection()
  const selectedText = sel.toString().trim()
  const url = prompt('URL:', 'https://')
  if (!url) return
  const linkText = selectedText || prompt('Texto del enlace:') || url
  if (!linkText) return
  const el = editorRef.value
  if (!el) return
  el.focus()
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.textContent = linkText
  range.insertNode(anchor)
  sel.removeAllRanges()
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
  if (editorRef.value) editorRef.value.innerHTML = ''
  nuevoMensaje.value = ''
}

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

function rollDice(count: number, sides: number): { total: number; rolls: number[] } {
  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1)
  }
  const total = rolls.reduce((a, b) => a + b, 0)
  return { total, rolls }
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

function toggleAyudaEditor() {
  mostrarAyudaEditor.value = !mostrarAyudaEditor.value
}

const mostrarAyudaEditor = ref(false)

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
</script>

<template>
  <div class="chat-input p-3 border-top bg-light position-relative">
    <div class="formatting-toolbar d-flex gap-1 px-2 py-1 border-bottom flex-wrap">
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('bold')" title="Negrita"><strong>B</strong></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('italic')" title="Cursiva"><em>I</em></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('strikeThrough')" title="Tachado"><s>S</s></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('underline')" title="Subrayado"><u>U</u></button>
      <span class="toolbar-divider"></span>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('blockquote')" title="Cita"><i class="bi bi-quote"></i></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('h3')" title="Título H3"><strong>H3</strong></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('h4')" title="Título H4"><strong>H4</strong></button>
      <span class="toolbar-divider"></span>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleDicePicker" title="Dados"><i class="bi bi-dice-6"></i></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleMentionPicker" title="Mencionar"><i class="bi bi-at"></i></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="insertLink" title="Enlace"><i class="bi bi-link-45deg"></i></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="execFormat('spoiler')" title="Spoiler"><i class="bi bi-eye-slash"></i></button>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="clearFormat" title="Limpiar formato"><i class="bi bi-eraser"></i></button>
      <span class="toolbar-divider"></span>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn emoji-btn" @mousedown.prevent="toggleEmojiPicker" title="Emojis">😊</button>
      <span class="toolbar-divider"></span>
      <button type="button" class="btn btn-sm btn-light border-0 fmt-btn" @mousedown.prevent="toggleAyudaEditor" title="Ayuda"><strong>?</strong></button>
    </div>

    <!-- Emoji picker -->
    <div v-if="mostrarEmojiPicker" class="emoji-picker shadow rounded-3 border bg-white p-2">
      <div class="emoji-categories d-flex gap-1 mb-2 flex-wrap">
        <button v-for="(cat, ci) in emojiCategories" :key="ci"
                class="emoji-cat-btn btn btn-sm border-0 px-2 py-1"
                :class="{ active: categoriaEmojiActiva === ci }"
                @mousedown.prevent="categoriaEmojiActiva = ci">
          {{ cat.name }}
        </button>
      </div>
      <div class="emoji-grid">
        <button v-for="(emoji, ei) in emojiCategories[categoriaEmojiActiva]?.emojis" :key="ei"
                class="emoji-item btn btn-sm border-0 p-1"
                @mousedown.prevent="insertEmoji(emoji)"
                :title="emoji">
          {{ emoji }}
        </button>
      </div>
    </div>

    <!-- Dice picker -->
    <div v-if="mostrarDicePicker" class="emoji-picker shadow rounded-3 border bg-white p-2" style="max-height:320px;">
      <div class="d-flex gap-2 align-items-center mb-2 px-1">
        <label class="small text-nowrap mb-0">Cantidad:</label>
        <select v-model="diceCount" class="form-select form-select-sm" style="width:auto;">
          <option v-for="n in diceQuantityOptions" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button v-for="dt in DICE_TYPES" :key="dt.label"
                class="btn btn-sm btn-outline-secondary"
                @mousedown.prevent="insertDice(dt)">
          {{ dt.label }}
        </button>
      </div>
    </div>

    <!-- Editor + send -->
    <form @submit.prevent="enviar" class="d-flex gap-2 align-items-end pt-2 position-relative">
      <div v-if="mostrarMentionPicker" class="mention-picker-inside shadow rounded-3 border bg-white p-2">
        <div v-if="filteredMentions.length === 0" class="text-muted small text-center py-2">No hay miembros disponibles</div>
        <button v-for="(m, mi) in filteredMentions" :key="m.id"
                class="d-block w-100 text-start btn btn-sm border-0 px-2 py-1 mention-item"
                :class="{ 'mention-highlight': mi === mentionHighlightIndex }"
                @mousedown.prevent="insertMention(m.personajeNombre)"
                @mouseenter="mentionHighlightIndex = mi">
          <img :src="avatarUrl(m.personajeAvatar)" class="rounded-circle me-2" width="20" height="20" style="object-fit:cover;" />
          {{ m.personajeNombre }}
        </button>
      </div>
      <div class="flex-grow-1 position-relative">
        <div ref="editorRef" contenteditable="true"
             class="form-control form-control-sm chat-editor"
             data-placeholder="Escribe un mensaje..."
             @keydown="handleEditorKeydown"
             @input="onEditorInput"></div>
        <div class="character-counter">
          <span :class="charsRestantes.usado > charsRestantes.max * 0.9 ? 'text-danger fw-bold' : 'text-muted'">
            {{ charsRestantes.usado }}/{{ charsRestantes.max }}
          </span>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-sm flex-shrink-0"
              :disabled="!nuevoMensaje.trim() || sending">
        <i class="bi bi-send"></i>
      </button>
    </form>

    <!-- Picker overlays -->
    <div v-if="mostrarEmojiPicker" class="context-menu-overlay" @click="handleOverlayClick('emoji')" @contextmenu.prevent="handleOverlayClick('emoji')"></div>
    <div v-if="mostrarDicePicker" class="context-menu-overlay" @click="handleOverlayClick('dice')" @contextmenu.prevent="handleOverlayClick('dice')"></div>
    <div v-if="mostrarMentionPicker" class="context-menu-overlay" @click="handleOverlayClick('mention')" @contextmenu.prevent="handleOverlayClick('mention')"></div>

    <!-- Ayuda editor modal -->
    <div v-if="mostrarAyudaEditor" class="modal-backdrop-custom" @click.self="mostrarAyudaEditor = false">
      <div class="modal-content-custom shadow rounded-3 p-4" style="max-width:480px;">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="mb-0"><i class="bi bi-question-circle me-2"></i>Ayuda del editor</h5>
          <button class="btn-close" @click="mostrarAyudaEditor = false"></button>
        </div>
        <div class="help-grid">
          <div class="help-item"><span class="help-key"><strong>B</strong></span><span>Negrita</span></div>
          <div class="help-item"><span class="help-key"><em>I</em></span><span>Cursiva</span></div>
          <div class="help-item"><span class="help-key"><s>S</s></span><span>Tachado</span></div>
          <div class="help-item"><span class="help-key"><u>U</u></span><span>Subrayado</span></div>
          <div class="help-item"><span class="help-key"><i class="bi bi-quote"></i></span><span>Cita en bloque</span></div>
          <div class="help-item"><span class="help-key"><strong>H3</strong></span><span>Encabezado grande</span></div>
          <div class="help-item"><span class="help-key"><strong>H4</strong></span><span>Encabezado pequeño</span></div>
          <div class="help-item"><span class="help-key"><i class="bi bi-dice-6"></i></span><span>Insertar dados (se lanzan al enviar)</span></div>
          <div class="help-item"><span class="help-key"><i class="bi bi-at"></i></span><span>Mencionar personaje — escribe <code>@</code> en el editor o usa este botón; navega con <kbd>↑</kbd><kbd>↓</kbd> y pulsa <kbd>Tab</kbd> o <kbd>Enter</kbd> para seleccionar</span></div>
          <div class="help-item"><span class="help-key"><i class="bi bi-link-45deg"></i></span><span>Insertar enlace</span></div>
          <div class="help-item"><span class="help-key"><i class="bi bi-eye-slash"></i></span><span>Spoiler — texto oculto (clic para revelar)</span></div>
          <div class="help-item"><span class="help-key"><i class="bi bi-eraser"></i></span><span>Limpiar formato</span></div>
          <div class="help-item"><span class="help-key">😊</span><span>Emojis — selecciona un emoji para insertarlo</span></div>
        </div>
        <div class="text-muted small mt-3">
          También puedes usar <kbd>Tab</kbd> para completar una mención si hay resultados disponibles.
        </div>
      </div>
    </div>
  </div>
</template>

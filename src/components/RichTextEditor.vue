<script setup lang="ts">
import { onBeforeUnmount, ref, watch, useId } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { Extension } from '@tiptap/core'
import { Bold, Italic, List, AlignLeft, AlignCenter, AlignRight, ImagesIcon } from 'lucide-vue-next'
import ModalInput from './ModalInput.vue'

const props = defineProps<{
  modelValue: string
  id?: string
  etiqueta?: string
}>()

const idGenerado = useId()
const editorId = props.id || `editor-trasfondo-${idGenerado}`

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize,
          renderHTML: attributes => {
            if (!attributes.fontSize) return {}
            return { style: `font-size: ${attributes.fontSize}` }
          },
        },
      },
    }]
  },
})

//configurar editor
const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Image,
    TextStyle,
    FontSize,
    Color,
    TextAlign.configure({
      types: ['heading', 'paragraph', 'listItem']
    })
  ],
  content: props.modelValue,
  editorProps: {
    attributes: {
      id: editorId,
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': props.etiqueta || 'Editor de texto enriquecido',
    },
  },
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  }
})

watch(() => props.modelValue, (newVal) => {
  if (!editor.value) return
  //rellenar el editor solo si esta vacio, para no pisar lo que el usuario esta escribiendo
  const currentContent = editor.value.getHTML()
  if (currentContent === '<p></p>' && newVal) {
    editor.value.commands.setContent(newVal)
  }
}, { immediate: true })

onBeforeUnmount(() => editor.value?.destroy())

function setAlign(align: 'left' | 'center' | 'right') {
  editor.value?.chain().focus().setTextAlign(align).run()
}

function setColor(event: Event) {
  const color = (event.target as HTMLInputElement).value
  editor.value?.chain().focus().setColor(color).run()
}

function setFontSize(event: Event) {
  const size = (event.target as HTMLSelectElement).value
  if (!size) {
    editor.value?.chain().focus().unsetMark('textStyle').run()
  } else {
    editor.value?.chain().focus().setMark('textStyle', { fontSize: size }).run()
  }
}

const mostrarModalImagen = ref(false)

function addImage() {
  mostrarModalImagen.value = true
}

function confirmarImagen(url: string) {
  if (url) {
    editor.value?.chain().focus().setImage({ src: url }).run()
  }
  mostrarModalImagen.value = false
}
</script>

<template>
  <div
    class="editor-toolbar mb-2"
    role="toolbar"
    aria-label="Formato del trasfondo"
    :aria-controls="editorId"
    focusgroup="toolbar wrap"
  >
    <div class="editor-toolbar__grupo" role="group" aria-label="Estilo del texto">
      <button
        type="button"
        class="icon-btn"
        :aria-pressed="editor?.isActive('bold') ?? false"
        aria-label="Negrita"
        title="Negrita"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Bold :size="18" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-pressed="editor?.isActive('italic') ?? false"
        aria-label="Cursiva"
        title="Cursiva"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Italic :size="18" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-pressed="editor?.isActive('bulletList') ?? false"
        aria-label="Lista con viñetas"
        title="Lista con viñetas"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List :size="18" aria-hidden="true" />
      </button>
    </div>

    <div class="editor-toolbar__grupo" role="group" aria-label="Alineación">
      <button
        type="button"
        class="icon-btn"
        :aria-pressed="editor?.isActive({ textAlign: 'left' }) ?? false"
        aria-label="Alinear a la izquierda"
        title="Alinear a la izquierda"
        @click="setAlign('left')"
      >
        <AlignLeft :size="18" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-pressed="editor?.isActive({ textAlign: 'center' }) ?? false"
        aria-label="Centrar"
        title="Centrar"
        @click="setAlign('center')"
      >
        <AlignCenter :size="18" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-pressed="editor?.isActive({ textAlign: 'right' }) ?? false"
        aria-label="Alinear a la derecha"
        title="Alinear a la derecha"
        @click="setAlign('right')"
      >
        <AlignRight :size="18" aria-hidden="true" />
      </button>
    </div>

    <div class="editor-toolbar__grupo" role="group" aria-label="Tamaño y color">
      <select
        class="font-size-select"
        aria-label="Tamaño de letra"
        title="Tamaño de letra"
        @change="setFontSize"
      >
        <option value="">Aa</option>
        <option value="12px">Pequeño</option>
        <option value="16px">Normal</option>
        <option value="20px">Medio</option>
        <option value="28px">Grande</option>
        <option value="36px">XL</option>
      </select>
      <input
        type="color"
        class="color-picker"
        aria-label="Color del texto"
        title="Color del texto"
        @input="setColor"
      />
    </div>

    <div class="editor-toolbar__grupo" role="group" aria-label="Insertar">
      <button
        type="button"
        class="icon-btn"
        aria-label="Insertar imagen"
        title="Insertar imagen"
        @click="addImage"
      >
        <ImagesIcon :size="18" aria-hidden="true" />
      </button>
    </div>
  </div>

  <EditorContent :editor="editor" class="editor-content" />

  <ModalInput
    v-if="mostrarModalImagen"
    titulo="Insertar imagen"
    etiqueta="URL de la imagen"
    placeholder="https://..."
    botonConfirmar="Insertar"
    @confirmar="confirmarImagen"
    @cancelar="mostrarModalImagen = false"
  />
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface-soft);
}

.editor-toolbar__grupo {
  display: flex;
  align-items: center;
  gap: 4px;
}

.editor-content {
  min-height: 450px;
  padding: 12px;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface);
  transition: border-color var(--pl-duration-fast) var(--pl-ease-standard), box-shadow var(--pl-duration-fast) var(--pl-ease-standard);
}

.editor-content:focus-within {
  border-color: var(--pl-primary);
  box-shadow: 0 0 0 3px rgba(var(--pl-primary-rgb), 0.18);
}

.editor-content :deep(.ProseMirror) {
  min-height: 450px;
  padding: 12px;
  font-size: 16px;
  line-height: 1.6;
}

.editor-content :deep(.ProseMirror:focus-visible) {
  outline: none;
}

.font-size-select {
  min-height: 32px;
  padding: 0 8px;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-sm);
  background: var(--pl-surface);
  color: var(--pl-ink);
  font-size: 13px;
  cursor: pointer;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard);
}

@media (hover: hover) {
  .font-size-select:hover {
    background: var(--pl-surface-soft);
    border-color: rgba(var(--pl-primary-rgb), 0.34);
  }
}

.font-size-select:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}

.color-picker {
  width: 32px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-sm);
  background: var(--pl-surface);
  cursor: pointer;
}

.color-picker:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 32px;
  min-block-size: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--pl-radius-sm);
  background: transparent;
  color: var(--pl-muted);
  cursor: pointer;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard);
}

@media (hover: hover) {
  .icon-btn:hover {
    border-color: var(--pl-border);
    background: var(--pl-surface);
    color: var(--pl-ink);
  }
}

.icon-btn[aria-pressed='true'] {
  border-color: rgba(var(--pl-primary-rgb), 0.3);
  background: rgba(var(--pl-primary-rgb), 0.12);
  color: var(--pl-primary-ink);
}

.icon-btn:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 1px;
}

@media (pointer: coarse) {
  .icon-btn,
  .font-size-select,
  .color-picker {
    min-inline-size: 44px;
    min-block-size: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon-btn,
  .font-size-select,
  .editor-content {
    transition: none;
  }
}
</style>

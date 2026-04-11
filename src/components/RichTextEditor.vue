<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { Extension } from '@tiptap/core'
import { Bold, Italic, List, AlignLeft, AlignCenter, AlignRight, ImagesIcon } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
}>()

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
    Link,
    TextStyle,
    FontSize,
    Color,
    TextAlign.configure({
      types: ['heading', 'paragraph', 'listItem']
    })
  ],
  content: props.modelValue,
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

function addImage() {
  const url = prompt("URL de la imagen")
  if (!url) return
  editor.value?.chain().focus().setImage({ src: url }).run()
}
</script>

<template>
  <div class="editor-toolbar mb-2">
    <button type="button" class="icon-btn" @click="editor?.chain().focus().toggleBold().run()">
      <Bold :size="18" />
    </button>
    <button type="button" class="icon-btn" @click="editor?.chain().focus().toggleItalic().run()">
      <Italic :size="18" />
    </button>
    <button type="button" class="icon-btn" @click="editor?.chain().focus().toggleBulletList().run()">
      <List :size="18" />
    </button>
    <button type="button" class="icon-btn" @click="setAlign('left')">
      <AlignLeft :size="18" />
    </button>
    <button type="button" class="icon-btn" @click="setAlign('center')">
      <AlignCenter :size="18" />
    </button>
    <button type="button" class="icon-btn" @click="setAlign('right')">
      <AlignRight :size="18" />
    </button>
    <select class="font-size-select" @change="setFontSize">
      <option value="">Aa</option>
      <option value="12px">Pequeño</option>
      <option value="16px">Normal</option>
      <option value="20px">Medio</option>
      <option value="28px">Grande</option>
      <option value="36px">XL</option>
    </select>
    <input type="color" class="color-picker" @input="setColor" />
    <button type="button" class="icon-btn" @click="addImage">
      <ImagesIcon :size="18" />
    </button>
  </div>

  <EditorContent :editor="editor" class="editor-content" />
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #f8f9fa;
}

.editor-content {
  min-height: 450px;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: white;
}

.editor-content :deep(.ProseMirror) {
  min-height: 450px;
  outline: none;
  padding: 12px;
  font-size: 16px;
  line-height: 1.6;
}

.font-size-select {
  height: 34px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  cursor: pointer;
  transition: 0.15s;
}

.font-size-select:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.font-size-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.icon-btn {
  position: relative;
  overflow: hidden;
}

.color-overlay {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

</style>
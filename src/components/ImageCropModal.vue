<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { useModalFocus } from '../composables/useModalFocus'

type CropperApi = {
  getResult: () => { canvas?: HTMLCanvasElement }
}

const props = withDefaults(defineProps<{
  archivo: File | null
  aspectRatio?: number | null
  maxWidth: number
  maxHeight: number
  maxBytes: number
  titulo?: string
  salidaCuadrada?: boolean
}>(), {
  aspectRatio: 1,
  titulo: 'Ajustar imagen',
  salidaCuadrada: true,
})

const emit = defineEmits<{
  (e: 'confirmar', archivo: File): void
  (e: 'cancelar'): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const cropperRef = ref<CropperApi | null>(null)
const procesando = ref(false)
const error = ref('')
const src = ref('')

useModalFocus({ containerRef, cerrar: () => emit('cancelar') })

watch(() => props.archivo, (file, _, onCleanup) => {
  error.value = ''
  if (!file) {
    src.value = ''
    return
  }
  const url = URL.createObjectURL(file)
  src.value = url
  onCleanup(() => URL.revokeObjectURL(url))
}, { immediate: true })

const stencilProps = computed(() => props.aspectRatio ? { aspectRatio: props.aspectRatio } : {})

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function extensionDesdeTipo(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

function tipoSalida(file: File): string {
  if (file.type === 'image/png') return 'image/png'
  if (file.type === 'image/webp') return 'image/webp'
  if (file.type === 'image/jpeg') return 'image/jpeg'
  return 'image/jpeg'
}

function redimensionarCanvas(canvas: HTMLCanvasElement, maxWidth: number, maxHeight: number): HTMLCanvasElement {
  const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height, 1)
  const width = Math.max(1, Math.round(canvas.width * ratio))
  const height = Math.max(1, Math.round(canvas.height * ratio))
  if (width === canvas.width && height === canvas.height) return canvas
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(canvas, 0, 0, width, height)
  return out
}

async function comprimirCanvas(canvas: HTMLCanvasElement, file: File): Promise<Blob> {
  const type = tipoSalida(file)
  const calidades = type === 'image/jpeg' ? [0.92, 0.85, 0.78, 0.7, 0.62, 0.54, 0.46, 0.4] : [undefined]
  let actual = redimensionarCanvas(canvas, props.maxWidth, props.maxHeight)

  for (let escalaIntento = 0; escalaIntento < 8; escalaIntento++) {
    for (const calidad of calidades) {
      const blob = await canvasToBlob(actual, type, calidad)
      if (blob && blob.size <= props.maxBytes) return blob
    }

    // Si no baja, reducimos dimensiones progresivamente (especialmente PNG/WebP sin control de calidad fiable).
    const nextWidth = Math.max(1, Math.round(actual.width * 0.85))
    const nextHeight = Math.max(1, Math.round(actual.height * 0.85))
    if (nextWidth === actual.width && nextHeight === actual.height) break
    const reducido = document.createElement('canvas')
    reducido.width = nextWidth
    reducido.height = nextHeight
    const ctx = reducido.getContext('2d')
    if (!ctx) break
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, nextWidth, nextHeight)
    ctx.drawImage(actual, 0, 0, nextWidth, nextHeight)
    actual = reducido
  }

  const ultimo = await canvasToBlob(actual, type, 0.4)
  if (ultimo) return ultimo
  throw new Error('No se pudo procesar la imagen')
}

async function confirmar() {
  error.value = ''
  const result = cropperRef.value?.getResult()
  const canvas = result?.canvas
  if (!canvas || !props.archivo) {
    error.value = 'No se pudo obtener el recorte de la imagen.'
    return
  }

  procesando.value = true
  try {
    const blob = await comprimirCanvas(canvas, props.archivo)
    if (blob.size > props.maxBytes) {
      error.value = `La imagen no se pudo comprimir por debajo de ${Math.round(props.maxBytes / 1024)} KB.`
      return
    }
    const type = blob.type || tipoSalida(props.archivo)
    const nombreBase = props.archivo.name.replace(/\.[^.]+$/, '') || 'imagen'
    const archivo = new File([blob], `${nombreBase}.${extensionDesdeTipo(type)}`, { type })
    emit('confirmar', archivo)
  } catch {
    error.value = 'No se pudo procesar la imagen. Prueba con otra imagen.'
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <div ref="containerRef" class="modal-backdrop-custom" @click.self="emit('cancelar')">
    <div class="modal-content-custom shadow rounded-3 p-4 image-crop-modal" role="dialog" aria-modal="true" :aria-label="titulo" tabindex="-1">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-crop me-2 text-warning"></i>{{ titulo }}</h5>
        <button type="button" class="btn-close" aria-label="Cerrar" @click="emit('cancelar')"></button>
      </div>

      <p class="text-muted small mb-3">
        Ajusta el recorte. La imagen se guardará con un máximo de {{ maxWidth }}x{{ maxHeight }} px y {{ Math.round(maxBytes / 1024) }} KB.
      </p>

      <div v-if="src" class="cropper-wrap mb-3">
        <Cropper
          ref="cropperRef"
          :src="src"
          :stencil-props="stencilProps"
          :auto-zoom="true"
          :resize-image="{ adjustStencil: false }"
          image-restriction="stencil"
          class="cropper"
        />
      </div>

      <p v-if="error" class="text-danger small mb-3">{{ error }}</p>

      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary" :disabled="procesando" @click="emit('cancelar')">Cancelar</button>
        <button type="button" class="btn btn-primary" :disabled="procesando || !src" @click="confirmar">
          {{ procesando ? 'Procesando...' : 'Aplicar recorte' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-crop-modal {
  width: min(720px, 94vw);
  max-height: 92vh;
  overflow: auto;
}
.cropper-wrap {
  background: #111;
  border-radius: 0.5rem;
  overflow: hidden;
}
.cropper {
  height: min(55vh, 420px);
  background: #111;
}
</style>
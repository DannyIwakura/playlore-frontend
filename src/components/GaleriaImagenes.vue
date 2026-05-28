<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'

const BASE_URL = import.meta.env.VITE_API_URL

const props = defineProps<{
  personajeId: number
  esPropietario?: boolean
}>()

const emit = defineEmits(['imagenSubida', 'imagenEliminada'])

interface ImagenDTO {
  idImagen: number
  idPersonaje: number
  url: string
  nombreOriginal: string
  fechaSubida: string
  orden: number
}

const imagenes = ref<ImagenDTO[]>([])
const cargando = ref(true)
const subiendo = ref(false)
const dragOver = ref(false)
const imagenPreview = ref<ImagenDTO | null>(null)
const eliminarConfirm = ref<number | null>(null)

const MAX_IMAGENES = 30

const imageCount = computed(() => imagenes.value.length)
const puedeSubir = computed(() => props.esPropietario && imageCount.value < MAX_IMAGENES)

function imagenUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return BASE_URL + url
}

function formatFecha(fecha: string): string {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function cargarImagenes() {
  cargando.value = true
  try {
    const { data } = await api.get<ImagenDTO[]>(`/personajes/${props.personajeId}/imagenes`)
    imagenes.value = data
  } catch {
    imagenes.value = []
  } finally {
    cargando.value = false
  }
}

async function subirArchivo(file: File) {
  if (!puedeSubir.value) return
  if (subiendo.value) return

  const tiposValidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!tiposValidos.includes(file.type)) {
    alert('Formato no permitido. Solo JPG, PNG, WEBP y GIF')
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen no puede superar los 10MB')
    return
  }

  subiendo.value = true
  try {
    const formData = new FormData()
    formData.append('imagenFile', file)
    const { data } = await api.post<ImagenDTO>(
      `/personajes/${props.personajeId}/imagenes`,
      formData
    )
    imagenes.value.push(data)
    emit('imagenSubida', data)
  } catch (e: any) {
    const msg = e.response?.data?.message || e.response?.data?.error || 'Error al subir la imagen'
    alert(msg)
  } finally {
    subiendo.value = false
  }
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  subirArchivo(file)
  input.value = ''
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (!puedeSubir.value) return
  dragOver.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = false
  if (!puedeSubir.value) return
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  subirArchivo(file)
}

async function eliminarImagen(idImagen: number) {
  try {
    await api.delete(`/personajes/${props.personajeId}/imagenes/${idImagen}`)
    imagenes.value = imagenes.value.filter(i => i.idImagen !== idImagen)
    emit('imagenEliminada', idImagen)
    eliminarConfirm.value = null
  } catch {
    alert('Error al eliminar la imagen')
  }
}

onMounted(cargarImagenes)
</script>

<template>
  <div class="galeria-container">
    <!-- Contador -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="galeria-titulo mb-0">
        <i class="bi bi-images me-2"></i>Galería
      </h5>
      <span class="image-count" :class="{ 'text-danger': imageCount >= MAX_IMAGENES }">
        {{ imageCount }} / {{ MAX_IMAGENES }}
      </span>
    </div>

    <!-- Zona de drag & drop -->
    <div
      v-if="puedeSubir"
      class="drop-zone"
      :class="{ 'drop-zone--active': dragOver, 'drop-zone--subiendo': subiendo }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="$refs.fileInput?.click()"
    >
      <div v-if="subiendo" class="drop-zone-content">
        <div class="spinner-border text-primary mb-2" role="status"></div>
        <span>Subiendo imagen...</span>
      </div>
      <div v-else class="drop-zone-content">
        <i class="bi bi-cloud-arrow-up fs-2"></i>
        <span v-if="imageCount >= MAX_IMAGENES" class="text-muted">
          Límite de {{ MAX_IMAGENES }} imágenes alcanzado
        </span>
        <span v-else>
          Arrastra una imagen aquí o <strong>haz clic para seleccionar</strong>
        </span>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="d-none"
        @change="handleFileInput"
      />
    </div>

    <!-- Grilla de imágenes -->
    <div v-if="cargando" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>

    <div v-else-if="imagenes.length === 0" class="text-center py-4 text-muted">
      <i class="bi bi-image fs-1 d-block mb-2"></i>
      <span>Este personaje no tiene imágenes en la galería</span>
    </div>

    <div v-else class="imagenes-grid">
      <div
        v-for="img in imagenes"
        :key="img.idImagen"
        class="imagen-item"
      >
        <img
          :src="imagenUrl(img.url)"
          :alt="img.nombreOriginal || 'Imagen de galería'"
          class="imagen-thumb"
          @click="imagenPreview = img"
        />

        <!-- Botón eliminar -->
        <button
          v-if="esPropietario"
          class="btn-eliminar"
          @click.stop="eliminarConfirm = img.idImagen"
          title="Eliminar imagen"
        >
          <i class="bi bi-trash3"></i>
        </button>

        <!-- Confirmación de eliminación -->
        <div
          v-if="eliminarConfirm === img.idImagen"
          class="eliminar-overlay"
          @click.stop
        >
          <div class="eliminar-confirm">
            <p class="mb-2 small">¿Eliminar esta imagen?</p>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-danger" @click.stop="eliminarImagen(img.idImagen)">
                Eliminar
              </button>
              <button class="btn btn-sm btn-outline-secondary" @click.stop="eliminarConfirm = null">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox / Preview modal -->
    <Teleport to="body">
      <div
        v-if="imagenPreview"
        class="preview-backdrop"
        @click.self="imagenPreview = null"
      >
        <div class="preview-container">
          <button class="preview-close" @click="imagenPreview = null">
            <i class="bi bi-x-lg"></i>
          </button>
          <img
            :src="imagenUrl(imagenPreview.url)"
            :alt="imagenPreview.nombreOriginal || 'Imagen de galería'"
            class="preview-image"
          />
          <div class="preview-info">
            <span>{{ imagenPreview.nombreOriginal || 'Sin nombre' }}</span>
            <span class="preview-date">{{ formatFecha(imagenPreview.fechaSubida) }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.galeria-container {
  width: 100%;
}

.galeria-titulo {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e1b4b;
}

.image-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
}

/* Zona de drop */
.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 1.25rem;
  background: #fafafa;
}

.drop-zone:hover {
  border-color: #4f46e5;
  background: #eef2ff;
}

.drop-zone--active {
  border-color: #4f46e5;
  background: #e0e7ff;
  transform: scale(1.01);
}

.drop-zone--subiendo {
  cursor: wait;
  opacity: 0.7;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.drop-zone-content strong {
  color: #4f46e5;
}

/* Grilla */
.imagenes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}

.imagen-item {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1;
  background: #f3f4f6;
  border: 1px solid #e8eaf0;
  transition: transform 0.18s ease;
}

.imagen-item:hover {
  transform: translateY(-2px);
}

.imagen-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  display: block;
}

.btn-eliminar {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s ease;
  font-size: 0.8rem;
}

.imagen-item:hover .btn-eliminar {
  opacity: 1;
}

.btn-eliminar:hover {
  background: rgba(220, 38, 38, 0.85);
}

/* Confirmación eliminar */
.eliminar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.eliminar-confirm {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  max-width: 180px;
}

/* Preview / Lightbox */
.preview-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  opacity: 0.8;
  transition: opacity 0.18s ease;
}

.preview-close:hover {
  opacity: 1;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
  object-fit: contain;
}

.preview-info {
  margin-top: 0.75rem;
  color: #d1d5db;
  font-size: 0.85rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.preview-date {
  color: #9ca3af;
}
</style>

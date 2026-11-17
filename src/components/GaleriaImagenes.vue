<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import api from '../services/api'
import ModalAviso from './ModalAviso.vue'

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
const indiceActual = ref<number | null>(null)
const eliminarConfirm = ref<number | null>(null)
const aviso = ref<string | null>(null)

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

const imagenActual = computed(() =>
  indiceActual.value !== null ? imagenes.value[indiceActual.value] : null
)

const totalImagenes = computed(() => imagenes.value.length)

function abrirCarousel(indice: number) {
  indiceActual.value = indice
}

function cerrarCarousel() {
  indiceActual.value = null
}

function irAnterior() {
  if (indiceActual.value === null || totalImagenes.value === 0) return
  indiceActual.value = (indiceActual.value - 1 + totalImagenes.value) % totalImagenes.value
}

function irSiguiente() {
  if (indiceActual.value === null || totalImagenes.value === 0) return
  indiceActual.value = (indiceActual.value + 1) % totalImagenes.value
}

function irAIndice(indice: number) {
  indiceActual.value = indice
}

const dialogRef = ref<HTMLDialogElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// <dialog> nativo: atrapa el foco, cierra con Escape y devuelve el foco al
// disparador. Solo hay que sincronizar el estado y bloquear el scroll del body.
watch(
  indiceActual,
  (nuevo) => {
    const dialogo = dialogRef.value
    if (nuevo !== null) {
      if (dialogo && !dialogo.open) {
        dialogo.showModal()
        document.body.style.overflow = 'hidden'
      }
      return
    }
    // Al cerrar el diálogo puede desmontarse antes de este watcher: no
    // dependemos de `dialogo` para restaurar el scroll.
    if (dialogo?.open) dialogo.close()
    document.body.style.overflow = ''
  },
  { flush: 'post' }
)

function onDialogClick(e: MouseEvent) {
  // Clic en el área del diálogo (fuera del contenido) = cerrar.
  if (e.target === dialogRef.value) cerrarCarousel()
}

function abrirSelector() {
  fileInput.value?.click()
}

onUnmounted(() => {
  document.body.style.overflow = ''
})

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
    aviso.value = 'Formato no permitido. Solo JPG, PNG, WEBP y GIF'
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    aviso.value = 'La imagen no puede superar los 10MB'
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
    aviso.value = msg
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
    aviso.value = 'Error al eliminar la imagen'
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

    <!-- Zona de drag & drop: botón real para que funcione con teclado -->
    <div v-if="puedeSubir" class="drop-zone-wrap">
      <button
        type="button"
        class="drop-zone"
        :class="{ 'drop-zone--active': dragOver, 'drop-zone--subiendo': subiendo }"
        :aria-busy="subiendo"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="abrirSelector"
      >
        <span v-if="subiendo" class="drop-zone-content">
          <span class="spinner-border text-primary" role="status" aria-hidden="true"></span>
          <span>Subiendo imagen...</span>
        </span>
        <span v-else class="drop-zone-content">
          <i class="bi bi-cloud-arrow-up fs-2" aria-hidden="true"></i>
          <span>Arrastra una imagen aquí o <strong>haz clic para seleccionar</strong></span>
        </span>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="d-none"
        tabindex="-1"
        aria-hidden="true"
        @change="handleFileInput"
      />
    </div>
    <p v-else-if="esPropietario" class="galeria-limite">
      Has alcanzado el límite de {{ MAX_IMAGENES }} imágenes.
    </p>

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
        v-for="(img, index) in imagenes"
        :key="img.idImagen"
        class="imagen-item"
      >
        <button
          type="button"
          class="imagen-abrir"
          :aria-label="`Ampliar imagen: ${img.nombreOriginal || 'sin nombre'}`"
          @click="abrirCarousel(index)"
        >
          <img
            :src="imagenUrl(img.url)"
            alt=""
            class="imagen-thumb"
            loading="lazy"
            decoding="async"
          />
        </button>

        <!-- Botón eliminar -->
        <button
          v-if="esPropietario"
          type="button"
          class="btn-eliminar"
          :aria-label="`Eliminar imagen: ${img.nombreOriginal || 'sin nombre'}`"
          @click.stop="eliminarConfirm = img.idImagen"
        >
          <i class="bi bi-trash3" aria-hidden="true"></i>
        </button>

        <!-- Confirmación de eliminación -->
        <div
          v-if="eliminarConfirm === img.idImagen"
          class="eliminar-overlay"
          role="group"
          aria-label="Confirmar eliminación de la imagen"
          @click.stop
        >
          <div class="eliminar-confirm">
            <p class="mb-2 small">¿Eliminar esta imagen?</p>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-danger" @click.stop="eliminarImagen(img.idImagen)">
                Eliminar
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click.stop="eliminarConfirm = null">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Carrusel / Lightbox: <dialog> nativo, atrapa el foco y cierra con Escape -->
    <Teleport to="body">
      <dialog
        v-if="indiceActual !== null && imagenActual"
        ref="dialogRef"
        class="carousel-dialog"
        aria-label="Visor de imágenes"
        @cancel="cerrarCarousel"
        @click="onDialogClick"
        @keydown.left.prevent="irAnterior"
        @keydown.right.prevent="irSiguiente"
      >
        <button
          type="button"
          class="carousel-close"
          aria-label="Cerrar visor"
          @click="cerrarCarousel"
        >
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>

        <!-- Imagen principal -->
        <div class="carousel-main">
          <button
            type="button"
            class="carousel-nav carousel-nav--prev"
            aria-label="Imagen anterior"
            @click="irAnterior"
          >
            <i class="bi bi-chevron-left" aria-hidden="true"></i>
          </button>

          <img
            :src="imagenUrl(imagenActual.url)"
            :alt="imagenActual.nombreOriginal || 'Imagen de galería'"
            class="carousel-image"
          />

          <button
            type="button"
            class="carousel-nav carousel-nav--next"
            aria-label="Imagen siguiente"
            @click="irSiguiente"
          >
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </div>

        <!-- Información -->
        <div class="carousel-info">
          <span>{{ imagenActual.nombreOriginal || 'Sin nombre' }}</span>
          <span class="carousel-date">{{ formatFecha(imagenActual.fechaSubida) }}</span>
          <span class="carousel-counter">{{ indiceActual! + 1 }} / {{ totalImagenes }}</span>
        </div>

        <!-- Miniaturas -->
        <div class="carousel-thumbnails">
          <button
            v-for="(img, index) in imagenes"
            :key="img.idImagen"
            type="button"
            class="carousel-thumb"
            :class="{ 'carousel-thumb--active': index === indiceActual }"
            :aria-current="index === indiceActual ? 'true' : undefined"
            :aria-label="`Ver imagen ${index + 1} de ${totalImagenes}`"
            @click="irAIndice(index)"
          >
            <img
              :src="imagenUrl(img.url)"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </button>
        </div>
      </dialog>
    </Teleport>
  </div>

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.galeria-container {
  width: 100%;
}

.galeria-titulo {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--pl-ink);
}

.image-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--pl-muted);
}

.galeria-limite {
  margin-bottom: 1.25rem;
  color: var(--pl-muted);
  font-size: 0.9rem;
}

/* Zona de drop (es un <button>: se resetean los estilos nativos) */
.drop-zone-wrap {
  margin-bottom: 1.25rem;
}

.drop-zone {
  display: block;
  width: 100%;
  padding: 2rem 1rem;
  border: 2px dashed rgba(var(--pl-primary-rgb), 0.32);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface-soft);
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.drop-zone:hover {
  border-color: var(--pl-primary);
  background: rgba(var(--pl-primary-rgb), 0.06);
}

.drop-zone:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 2px;
}

.drop-zone--active {
  border-color: var(--pl-primary);
  background: rgba(var(--pl-primary-rgb), 0.12);
}

@media (prefers-reduced-motion: no-preference) {
  .drop-zone--active {
    transform: scale(1.01);
  }
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
  color: var(--pl-muted);
  font-size: 0.9rem;
}

.drop-zone-content strong {
  color: var(--pl-primary);
}

/* Grilla */
.imagenes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}

.imagen-item {
  position: relative;
  border-radius: var(--pl-radius-md);
  overflow: hidden;
  aspect-ratio: 1;
  background: var(--pl-surface-soft);
  border: 1px solid var(--pl-border);
  transition: box-shadow 0.18s ease;
}

.imagen-item:hover {
  box-shadow: var(--pl-shadow-md);
}

@media (prefers-reduced-motion: no-preference) {
  .imagen-item {
    transition: box-shadow 0.18s ease, transform 0.18s ease;
  }

  .imagen-item:hover {
    transform: translateY(-2px);
  }
}

.imagen-abrir {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}

.imagen-abrir:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: -4px;
}

.imagen-thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-eliminar {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(17, 24, 39, 0.72);
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s ease, background 0.18s ease;
}

.imagen-item:hover .btn-eliminar,
.btn-eliminar:focus-visible {
  opacity: 1;
}

.btn-eliminar:hover {
  background: var(--pl-danger-strong);
}

.btn-eliminar:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

/* Sin hover no hay forma de revelarlo: se deja siempre visible. */
@media (hover: none) {
  .btn-eliminar {
    opacity: 1;
  }
}

/* Confirmación eliminar */
.eliminar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: rgba(15, 23, 42, 0.66);
  z-index: 2;
}

.eliminar-confirm {
  max-width: 200px;
  padding: 1rem;
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface);
  color: var(--pl-ink);
  text-align: center;
}

/* Carrusel / Lightbox: <dialog> nativo a pantalla completa */
.carousel-dialog {
  position: fixed;
  inset: 0;
  width: 100%;
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  padding: 1.5rem;
  border: 0;
  background: rgba(9, 12, 20, 0.94);
  color: #fff;
  overflow: hidden;
  overscroll-behavior: contain;
  user-select: none;
}

.carousel-dialog[open] {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.carousel-dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

.carousel-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.18s ease, background 0.18s ease;
  z-index: 10;
}

.carousel-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.22);
}

.carousel-close:focus-visible {
  opacity: 1;
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.carousel-main {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 85vw;
  max-height: 65vh;
}

.carousel-image {
  max-width: 100%;
  max-height: 65vh;
  border-radius: var(--pl-radius-md);
  object-fit: contain;
  box-shadow: 0 4px 40px rgba(0, 0, 0, 0.5);
}

.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1.3rem;
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.18s ease, background 0.18s ease;
  z-index: 5;
}

.carousel-nav:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}

.carousel-nav:focus-visible {
  opacity: 1;
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.carousel-nav--prev {
  left: -56px;
}

.carousel-nav--next {
  right: -56px;
}

/* En pantallas estrechas los botones no caben fuera de la imagen. */
@media (max-width: 575.98px) {
  .carousel-main {
    max-width: 100%;
  }

  .carousel-nav {
    background: rgba(9, 12, 20, 0.72);
  }

  .carousel-nav--prev {
    left: 0.25rem;
  }

  .carousel-nav--next {
    right: 0.25rem;
  }
}

.carousel-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.35rem 1.25rem;
  margin-top: 0.75rem;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.85rem;
  text-align: center;
}

.carousel-date {
  color: rgba(255, 255, 255, 0.7);
}

.carousel-counter {
  color: #a5b4fc;
  font-weight: 600;
  font-size: 0.8rem;
}

.carousel-thumbnails {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  max-width: 85vw;
  margin-top: 1rem;
  padding: 0.5rem;
  overflow-x: auto;
}

.carousel-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--pl-radius-sm);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.18s ease, border-color 0.18s ease;
}

.carousel-thumb:hover {
  opacity: 0.8;
  border-color: rgba(255, 255, 255, 0.4);
}

.carousel-thumb:focus-visible {
  opacity: 1;
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.carousel-thumb--active {
  opacity: 1;
  border-color: #a5b4fc;
}

.carousel-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

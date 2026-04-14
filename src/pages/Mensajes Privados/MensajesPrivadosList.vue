<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import { userStore } from '../../store/userStore'
import axios from '../../services/api'

// --- Tipos ---
interface MensajePrivadoDTO {
  id: number
  emisorId: number
  receptorId: number
emisorNombre: string
  receptorNombre: string 
  contenido: string
  titulo: string
  fechaEnvio: string
  leido: boolean
  archivado: boolean
  esMio: boolean
}

// --- Estado ---
const pestanaActiva = ref<'recibidos' | 'enviados' | 'archivados' | 'papelera'>('recibidos')
const mensajes = ref<MensajePrivadoDTO[]>([])
const mensajeSeleccionado = ref<MensajePrivadoDTO | null>(null)
const cargando = ref(false)
const error = ref<string | null>(null)

// Modal nuevo mensaje
const modalNuevoMensaje = ref(false)
const nuevoMensaje = ref({ receptorId: '', titulo: '', contenido: '' })
const enviando = ref(false)
const mensajePapelera = ref<number[]>([]) // IDs eliminados localmente (papelera visual)

const userId = computed(() => userStore.usuario.value?.id)

// --- Avatar placeholder por ID ---
function avatarUrl(id: number): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${id}`
}

// --- Formato de fecha ---
function formatFecha(fecha: string): string {
  if (!fecha) return ''
  const d = new Date(fecha)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

// --- Carga de mensajes según pestaña ---
async function cargarMensajes() {
  if (!userId.value) return
  cargando.value = true
  error.value = null
  mensajeSeleccionado.value = null
  try {
    let url = ''
    if (pestanaActiva.value === 'recibidos') {
      url = `/mensajes/recibidos/${userId.value}`
    } else if (pestanaActiva.value === 'enviados') {
      url = `/mensajes/enviados/${userId.value}`
    } else if (pestanaActiva.value === 'archivados') {
      url = `/mensajes/archivados/${userId.value}`
    } else if (pestanaActiva.value === 'papelera') {
      // Papelera: mensajes marcados localmente como eliminados
      // Aquí mostramos los que el usuario ha borrado en esta sesión
      mensajes.value = []
      cargando.value = false
      return
    }
    const { data } = await axios.get<MensajePrivadoDTO[]>(url)
    // Excluir los que están en papelera local
    mensajes.value = data.filter(m => !mensajePapelera.value.includes(m.id))
  } catch (e) {
    error.value = 'Error al cargar los mensajes. Inténtalo de nuevo.'
  } finally {
    cargando.value = false
  }
}

// --- Seleccionar mensaje y marcar como leído ---
async function seleccionarMensaje(m: MensajePrivadoDTO) {
  mensajeSeleccionado.value = m
  if (!m.leido && !m.esMio && userId.value) {
    try {
      await axios.put(`/mensajes/marcar-leido/${m.id}/${userId.value}`)
      m.leido = true
    } catch (_) { /* silencioso */ }
  }
}

// --- Archivar mensaje ---
async function archivarMensaje(m: MensajePrivadoDTO) {
  if (!userId.value) return
  try {
    await axios.put(`/mensajes/archivar/${m.id}/${userId.value}`)
    mensajes.value = mensajes.value.filter(msg => msg.id !== m.id)
    if (mensajeSeleccionado.value?.id === m.id) mensajeSeleccionado.value = null
  } catch (_) {
    alert('No se pudo archivar el mensaje.')
  }
}

// --- Mover a papelera (eliminación local + API) ---
async function eliminarMensaje(m: MensajePrivadoDTO) {
  if (!userId.value) return
  if (!confirm('¿Seguro que quieres eliminar este mensaje?')) return
  try {
    await axios.delete(`/mensajes/${m.id}/${userId.value}`)
    mensajePapelera.value.push(m.id)
    mensajes.value = mensajes.value.filter(msg => msg.id !== m.id)
    if (mensajeSeleccionado.value?.id === m.id) mensajeSeleccionado.value = null
  } catch (_) {
    alert('No se pudo eliminar el mensaje.')
  }
}

// --- Enviar nuevo mensaje ---
async function enviarNuevoMensaje() {
    console.log('[enviarMensaje] userId:', userId.value)
  if (!userId.value) return
  enviando.value = true

  const payload = {
    emisorId: userId.value,
    receptorId: Number(nuevoMensaje.value.receptorId),
    titulo: nuevoMensaje.value.titulo,
    contenido: nuevoMensaje.value.contenido
  }
  console.log('[enviarMensaje] Payload:', payload)

  try {
    const response = await axios.post('/mensajes/enviar', payload)
    console.log('[enviarMensaje] Respuesta OK:', response.status, response.data)

    modalNuevoMensaje.value = false
    nuevoMensaje.value = { receptorId: '', titulo: '', contenido: '' }
    if (pestanaActiva.value === 'enviados') await cargarMensajes()
  } catch (error: any) {
    console.error('[enviarMensaje] Error:', error.response?.status, error.response?.data ?? error.message)
    alert('Error al enviar el mensaje.')
  } finally {
    enviando.value = false
  }
}

// --- Cambio de pestaña ---
function cambiarPestana(p: typeof pestanaActiva.value) {
  pestanaActiva.value = p
  cargarMensajes()
}

onMounted(() => {
  userStore.cargarDesdeToken()  // ← añade esta línea
  cargarMensajes()
})
</script>

<template>
  <NavBar :logeado="true" />

  <section class="container mt-5 mb-5">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="mb-0">Mensajes Privados</h1>
      <button class="btn btn-primary" @click="modalNuevoMensaje = true">
        <i class="bi bi-pencil-square me-1"></i> Nuevo mensaje
      </button>
    </div>

    <div class="row g-0 mensajes-panel shadow-sm rounded overflow-hidden border">

      <!-- ======= COLUMNA IZQUIERDA: pestañas ======= -->
      <div class="col-12 col-md-3 pestanas-col border-end">
        <nav class="list-group list-group-flush">
          <button
            v-for="tab in [
              { key: 'recibidos',  label: 'Bandeja de entrada', icon: 'bi-inbox-fill' },
              { key: 'enviados',   label: 'Enviados',           icon: 'bi-send-fill' },
              { key: 'archivados', label: 'Archivados',         icon: 'bi-archive-fill' },
              { key: 'papelera',   label: 'Papelera',           icon: 'bi-trash3-fill' },
            ]"
            :key="tab.key"
            class="list-group-item list-group-item-action pestana-btn d-flex align-items-center gap-2"
            :class="{ active: pestanaActiva === tab.key }"
            @click="cambiarPestana(tab.key as any)"
          >
            <i :class="`bi ${tab.icon}`"></i>
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </div>

      <!-- ======= COLUMNA CENTRO: lista de mensajes ======= -->
      <div class="col-12 col-md-4 lista-col border-end">

        <!-- Estado: cargando -->
        <div v-if="cargando" class="d-flex justify-content-center align-items-center h-100 py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <!-- Estado: error -->
        <div v-else-if="error" class="alert alert-danger m-3">{{ error }}</div>

        <!-- Estado: vacío -->
        <div v-else-if="mensajes.length === 0" class="text-center text-muted py-5 px-3">
          <i class="bi bi-envelope-open fs-1 d-block mb-2 opacity-50"></i>
          <span v-if="pestanaActiva === 'papelera'">La papelera está vacía.</span>
          <span v-else>No hay mensajes en esta sección.</span>
        </div>

        <!-- Lista de mensajes -->
        <ul v-else class="list-unstyled m-0">
          <li
            v-for="m in mensajes"
            :key="m.id"
            class="mensaje-item px-3 py-3 border-bottom d-flex align-items-start gap-3"
            :class="{
              'mensaje-item--activo': mensajeSeleccionado?.id === m.id,
              'mensaje-item--noleido': !m.leido && !m.esMio
            }"
            @click="seleccionarMensaje(m)"
          >
            <!-- Avatar -->
            <img
              :src="avatarUrl(m.esMio ? m.receptorId : m.emisorId)"
              class="avatar-img rounded-circle flex-shrink-0"
              width="40" height="40"
              :alt="`Avatar usuario ${m.esMio ? m.receptorId : m.emisorId}`"
            />
            <!-- Contenido del item -->
            <div class="flex-grow-1 overflow-hidden">
              <div class="d-flex justify-content-between align-items-baseline">
                <span class="text-muted small">
                  {{ m.esMio ? `Para: ${m.receptorNombre}` : `De: ${m.emisorNombre}` }}
                </span>
                <span class="text-muted" style="font-size:0.72rem; white-space:nowrap">
                  {{ formatFecha(m.fechaEnvio) }}
                </span>
              </div>
              <p class="mb-0 text-truncate" :class="{ 'fw-bold': !m.leido && !m.esMio }">
                {{ m.titulo || '(Sin asunto)' }}
              </p>
              <!-- Badge no leído -->
              <span v-if="!m.leido && !m.esMio" class="badge bg-primary badge-noleido mt-1">Nuevo</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- ======= COLUMNA DERECHA: detalle del mensaje ======= -->
      <div class="col-12 col-md-5 detalle-col">
        <!-- Sin mensaje seleccionado -->
        <div v-if="!mensajeSeleccionado" class="h-100 d-flex flex-column justify-content-center align-items-center text-muted py-5 px-4">
          <i class="bi bi-envelope fs-1 mb-3 opacity-40"></i>
          <p class="mb-0">Selecciona un mensaje para leerlo</p>
        </div>

        <!-- Detalle del mensaje -->
        <div v-else class="p-4 h-100 d-flex flex-column">
          <!-- Cabecera -->
          <div class="d-flex align-items-start gap-3 mb-3">
            <img
              :src="avatarUrl(mensajeSeleccionado.esMio ? mensajeSeleccionado.receptorId : mensajeSeleccionado.emisorId)"
              class="rounded-circle flex-shrink-0"
              width="48" height="48"
            />
            <div>
              <h5 class="mb-0">{{ mensajeSeleccionado.titulo || '(Sin asunto)' }}</h5>
              <small class="text-muted">
                {{ mensajeSeleccionado.esMio
                    ? `Para: ${mensajeSeleccionado.receptorNombre}`
                    : `De: ${mensajeSeleccionado.emisorNombre}` }}
                · {{ formatFecha(mensajeSeleccionado.fechaEnvio) }}
              </small>
            </div>
          </div>

          <hr class="my-2" />

          <!-- Cuerpo del mensaje -->
          <div class="flex-grow-1 mensaje-cuerpo mb-4">
            {{ mensajeSeleccionado.contenido }}
          </div>

          <!-- Acciones -->
          <div class="d-flex gap-2 flex-wrap">
            <button
              v-if="pestanaActiva !== 'archivados'"
              class="btn btn-outline-secondary btn-sm"
              @click="archivarMensaje(mensajeSeleccionado)"
              title="Archivar"
            >
              <i class="bi bi-archive me-1"></i>Archivar
            </button>
            <button
              class="btn btn-outline-danger btn-sm"
              @click="eliminarMensaje(mensajeSeleccionado)"
              title="Eliminar"
            >
              <i class="bi bi-trash3 me-1"></i>Eliminar
            </button>
            <button
              v-if="!mensajeSeleccionado.esMio"
              class="btn btn-primary btn-sm ms-auto"
              @click="() => {
                nuevoMensaje.receptorId = String(mensajeSeleccionado!.emisorId)
                nuevoMensaje.titulo = 'Re: ' + (mensajeSeleccionado!.titulo || '')
                modalNuevoMensaje = true
              }"
            >
              <i class="bi bi-reply me-1"></i>Responder
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ======= MODAL: Nuevo Mensaje ======= -->
  <div v-if="modalNuevoMensaje" class="modal-backdrop-custom" @click.self="modalNuevoMensaje = false">
    <div class="modal-dialog-custom shadow-lg rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Nuevo mensaje</h5>
        <button class="btn-close" @click="modalNuevoMensaje = false"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">ID del destinatario</label>
        <input
          v-model="nuevoMensaje.receptorId"
          type="number"
          class="form-control"
          placeholder="Ej: 42"
        />
      </div>
      <div class="mb-3">
        <label class="form-label">Asunto</label>
        <input
          v-model="nuevoMensaje.titulo"
          type="text"
          class="form-control"
          maxlength="150"
          placeholder="Asunto del mensaje"
        />
      </div>
      <div class="mb-4">
        <label class="form-label">Mensaje</label>
        <textarea
          v-model="nuevoMensaje.contenido"
          class="form-control"
          rows="5"
          maxlength="2000"
          placeholder="Escribe tu mensaje aquí..."
        ></textarea>
        <div class="text-end text-muted small mt-1">{{ nuevoMensaje.contenido.length }}/2000</div>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary" @click="modalNuevoMensaje = false">Cancelar</button>
        <button
          class="btn btn-primary"
          :disabled="enviando || !nuevoMensaje.receptorId || !nuevoMensaje.contenido"
          @click="enviarNuevoMensaje"
        >
          <span v-if="enviando" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-send me-1"></i>
          Enviar
        </button>
      </div>
    </div>
  </div>

  <Footer />
</template>

<style scoped>
/* Panel general */
.mensajes-panel {
  min-height: 520px;
  background: #fff;
}

/* Columna de pestañas */
.pestanas-col {
  background: #f8f9fa;
}

.pestana-btn {
  border-radius: 0 !important;
  border: none;
  font-size: 0.9rem;
  padding: 0.85rem 1.1rem;
  color: #495057;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.pestana-btn:hover {
  background: #e9ecef;
}

.pestana-btn.active {
  background: #fff;
  color: #0d6efd;
  font-weight: 600;
  border-right: 3px solid #0d6efd;
}

/* Columna lista */
.lista-col {
  overflow-y: auto;
  max-height: 600px;
}

.mensaje-item {
  cursor: pointer;
  transition: background 0.12s;
}

.mensaje-item:hover {
  background: #f0f4ff;
}

.mensaje-item--activo {
  background: #e7efff !important;
}

.mensaje-item--noleido {
  border-left: 3px solid #0d6efd;
}

.avatar-img {
  object-fit: cover;
  background: #dee2e6;
}

.badge-noleido {
  font-size: 0.65rem;
  padding: 0.2em 0.5em;
}

/* Columna detalle */
.detalle-col {
  background: #fff;
  min-height: 400px;
}

.mensaje-cuerpo {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
  font-size: 0.95rem;
  color: #343a40;
  overflow-y: auto;
  max-height: 350px;
}

/* Modal personalizado (sin Bootstrap JS) */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-dialog-custom {
  background: #fff;
  width: 100%;
  max-width: 520px;
  margin: 1rem;
}
</style>
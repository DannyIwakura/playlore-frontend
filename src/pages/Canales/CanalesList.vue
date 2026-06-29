<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import { chatApi } from '../../services/chatApi'
import { characterSessionStore } from '../../store/characterSessionStore'

const router = useRouter()

interface CanalDTO {
  id: number
  nombre: string
  descripcion: string
  tipo: string
  privado: boolean
  miembroCount: number
  miRol: string | null
}

const pestanaActiva = ref<'unidos' | 'disponibles'>('unidos')
const canalesUnidos = ref<CanalDTO[]>([])
const canalesDisponibles = ref<CanalDTO[]>([])
const cargando = ref(false)

const mostrarModalCrear = ref(false)
const nuevoCanal = ref({ nombre: '', descripcion: '', privado: false })
const errorCrear = ref('')
const mensajeModal = ref<{ titulo: string; texto: string } | null>(null)

async function cargarCanales() {
  if (!characterSessionStore.haySesionActiva()) {
    router.push('/dashboard')
    return
  }
  cargando.value = true
  try {
    const [unidos, disponibles] = await Promise.all([
      chatApi.obtenerCanalesUnidos(),
      chatApi.obtenerCanalesDisponibles(),
    ])
    canalesUnidos.value = unidos.data
    canalesDisponibles.value = disponibles.data
  } catch {
    // silencioso
  } finally {
    cargando.value = false
  }
}

function abrirCanal(id: number) {
  router.push(`/canales/${id}`)
}

async function unirse(canalId: number) {
  try {
    await chatApi.unirseACanal(canalId)
    await cargarCanales()
    pestanaActiva.value = 'unidos'
  } catch (e: any) {
    mensajeModal.value = { titulo: 'Error', texto: e.response?.data?.error || 'Error al unirse al canal' }
  }
}

async function crearCanal() {
  if (!nuevoCanal.value.nombre.trim()) {
    errorCrear.value = 'El nombre es obligatorio'
    return
  }
  errorCrear.value = ''
  try {
    await chatApi.crearCanal(nuevoCanal.value)
    mostrarModalCrear.value = false
    nuevoCanal.value = { nombre: '', descripcion: '', privado: false }
    await cargarCanales()
    pestanaActiva.value = 'unidos'
  } catch (e: any) {
    errorCrear.value = e.response?.data?.error || 'Error al crear el canal'
  }
}

onMounted(cargarCanales)
</script>

<template>
  <NavBar :logeado="true" />

  <section class="container mt-5 mb-5">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="mb-0">Canales de Chat</h1>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-primary" @click="cargarCanales" :disabled="cargando">
          <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
        </button>
        <button class="btn btn-primary" @click="mostrarModalCrear = true">
          <i class="bi bi-plus-lg me-1"></i> Crear canal
        </button>
      </div>
    </div>

    <!-- Pestañas -->
    <ul class="nav nav-tabs mb-4">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: pestanaActiva === 'unidos' }"
                @click="pestanaActiva = 'unidos'">
          <i class="bi bi-check-circle me-1"></i> Mis canales
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: pestanaActiva === 'disponibles' }"
                @click="pestanaActiva = 'disponibles'">
          <i class="bi bi-plus-circle me-1"></i> Descubrir
        </button>
      </li>
    </ul>

    <!-- Cargando -->
    <div v-if="cargando" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <!-- Canales unidos -->
    <div v-else-if="pestanaActiva === 'unidos'">
      <div v-if="canalesUnidos.length === 0" class="text-center text-muted py-5">
        <i class="bi bi-chat-dots fs-1 d-block mb-2 opacity-50"></i>
        <p>No estás en ningún canal. ¡Descubre o crea uno!</p>
      </div>

      <div v-else class="row">
        <div v-for="canal in canalesUnidos" :key="canal.id" class="col-md-6 col-lg-4 mb-3">
          <div class="card canal-card h-100" @click="abrirCanal(canal.id)">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <h5 class="card-title mb-1">{{ canal.nombre }}</h5>
                <span class="badge" :class="canal.tipo === 'OFFICIAL' ? 'bg-warning text-dark' : 'bg-info'">
                  {{ canal.tipo === 'OFFICIAL' ? 'Oficial' : 'Usuario' }}
                </span>
              </div>
              <p class="card-text text-muted small mb-2">{{ canal.descripcion || 'Sin descripción' }}</p>
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">
                  <i class="bi bi-people me-1"></i> {{ canal.miembroCount }} miembros
                </small>
                <span v-if="canal.miRol" class="badge bg-secondary">{{ canal.miRol }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Canales disponibles -->
    <div v-else>
      <div v-if="canalesDisponibles.length === 0" class="text-center text-muted py-5">
        <i class="bi bi-search fs-1 d-block mb-2 opacity-50"></i>
        <p>No hay más canales disponibles para unirse.</p>
      </div>

      <div v-else class="row">
        <div v-for="canal in canalesDisponibles" :key="canal.id" class="col-md-6 col-lg-4 mb-3">
          <div class="card canal-card h-100">
            <div class="card-body">
              <h5 class="card-title mb-1">{{ canal.nombre }}</h5>
              <p class="card-text text-muted small mb-2">{{ canal.descripcion || 'Sin descripción' }}</p>
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">
                  <i class="bi bi-people me-1"></i> {{ canal.miembroCount }} miembros
                </small>
                <button class="btn btn-sm btn-outline-success" @click.stop="unirse(canal.id)">
                  <i class="bi bi-plus me-1"></i> Unirse
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal crear canal -->
  <div v-if="mostrarModalCrear" class="modal-backdrop-custom" @click.self="mostrarModalCrear = false">
    <div class="modal-dialog-custom shadow-lg rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Crear nuevo canal</h5>
        <button class="btn-close" @click="mostrarModalCrear = false"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Nombre del canal</label>
        <input v-model="nuevoCanal.nombre" type="text" class="form-control" maxlength="100" placeholder="Nombre" />
      </div>
      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <textarea v-model="nuevoCanal.descripcion" class="form-control" rows="3" maxlength="500" placeholder="¿De qué va este canal?"></textarea>
      </div>
      <div class="mb-3 form-check">
        <input v-model="nuevoCanal.privado" type="checkbox" class="form-check-input" id="privado" />
        <label class="form-check-label" for="privado">Canal privado (solo por invitación)</label>
      </div>
      <div v-if="errorCrear" class="alert alert-danger py-2">{{ errorCrear }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary" @click="mostrarModalCrear = false">Cancelar</button>
        <button class="btn btn-primary" @click="crearCanal">
          <i class="bi bi-check-lg me-1"></i> Crear
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Mensaje de error/info -->
  <div v-if="mensajeModal" class="modal-backdrop-custom" @click.self="mensajeModal = null">
    <div class="modal-dialog-custom shadow-lg rounded-3 p-4" style="max-width:420px;">
      <h5 class="mb-3">{{ mensajeModal.titulo }}</h5>
      <p class="mb-4">{{ mensajeModal.texto }}</p>
      <div class="d-flex justify-content-end">
        <button class="btn btn-primary" @click="mensajeModal = null">Aceptar</button>
      </div>
    </div>
  </div>

  <Footer />
</template>

<style scoped>
.canal-card {
  cursor: pointer;
  transition: box-shadow 0.18s, transform 0.18s;
  border: 1px solid #dee2e6;
}
.canal-card:hover {
  box-shadow: 0 4px 18px rgba(13, 110, 253, 0.10);
  transform: translateY(-2px);
  border-color: #0d6efd;
}

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

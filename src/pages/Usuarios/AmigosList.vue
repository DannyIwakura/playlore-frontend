<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'

const AVATAR_DEFECTO = 'http://localhost:8080/api/images/AVATAR.png'

const miId = computed(() => userStore.usuario.value?.id)

const tabActiva = ref<'amigos' | 'recibidas' | 'enviadas'>('amigos')

const amigos    = ref<any[]>([])
const recibidas = ref<any[]>([])
const enviadas  = ref<any[]>([])
const cargando  = ref(false)

const mostrarBuscar     = ref(false)
const nombreBusqueda    = ref('')
const resultadoBusqueda = ref<any>(null)
const cargandoBusqueda  = ref(false)
const errorBusqueda     = ref('')
const solicitudEnviada  = ref(false)

const amigoAEliminar = ref<any>(null)
const yaEsAmigo = ref(false)

const BASE_URL = 'http://localhost:8080/api'

// Controlar que se esté intentado buscar a sí mismo
const esSiMismo = computed(() => 
  resultadoBusqueda.value?.userId === miId.value
)

function avatarUrl(avatar: string | null | undefined, id?: number): string {
  if (
    !avatar ||
    avatar.includes('AVATAR.png') ||
    avatar.includes('default.png')
  ) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) {
    return avatar
  }

  return BASE_URL + avatar
}

async function cargarAmigos() {
  cargando.value = true
  try {
    const res = await api.get(`/usuarios/${miId.value}/amigos`)
    amigos.value = res.data
  } finally {
    cargando.value = false
  }
}

async function cargarRecibidas() {
  cargando.value = true
  try {
    const res = await api.get(`/amistades/pendientes-recibidas/${miId.value}`)
    recibidas.value = res.data
  } finally {
    cargando.value = false
  }
}

async function cargarEnviadas() {
  cargando.value = true
  try {
    const res = await api.get(`/amistades/pendientes-enviadas/${miId.value}`)
    enviadas.value = res.data
  } finally {
    cargando.value = false
  }
}

watch(tabActiva, (nueva) => {
  mostrarBuscar.value = false
  if (nueva === 'amigos')    cargarAmigos()
  if (nueva === 'recibidas') cargarRecibidas()
  if (nueva === 'enviadas')  cargarEnviadas()
}, { immediate: true })

async function buscarUsuario() {
  errorBusqueda.value = ''
  resultadoBusqueda.value = null
  solicitudEnviada.value = false
  yaEsAmigo.value = false
  if (!nombreBusqueda.value.trim()) return
  cargandoBusqueda.value = true
  try {
    const res = await api.get('/usuarios/buscar', { params: { nombre: nombreBusqueda.value.trim() } })
    resultadoBusqueda.value = res.data

    const receptorId = res.data.userId
    // Comprobar si ya existe solicitud pendiente o ya es amigo
    const [resSolicitud, resAmigos] = await Promise.all([
      api.get(`/amistades/comprobar-existencia/${miId.value}/${receptorId}`),
      api.get(`/usuarios/${miId.value}/amigos`)
    ])
    solicitudEnviada.value = resSolicitud.data
    yaEsAmigo.value = resAmigos.data.some((a: any) => a.id === receptorId)
  } catch {
    errorBusqueda.value = 'No se encontró ningún usuario con ese nombre.'
  } finally {
    cargandoBusqueda.value = false
  }
}

async function enviarSolicitud(receptorId: number) {
  try {
    await api.post('/amistades', { emisorId: miId.value, receptorId })
    solicitudEnviada.value = true
  } catch {
    errorBusqueda.value = 'No se pudo enviar la solicitud.'
  }
}

async function aceptarSolicitud(idSolicitud: number) {
  await api.put(`/amistades/aceptar/${idSolicitud}`)
  cargarRecibidas()
  cargarAmigos()
}

async function rechazarSolicitud(idSolicitud: number) {
  await api.put(`/amistades/rechazar/${idSolicitud}`)
  cargarRecibidas()
}

async function cancelarSolicitud(idSolicitud: number) {
  await api.delete(`/amistades/${idSolicitud}`)
  cargarEnviadas()
}

function confirmarEliminar(amigo: any) {
  amigoAEliminar.value = amigo
}

async function eliminarAmigo() {
  await api.delete(`/usuarios/${miId.value}/amigos/${amigoAEliminar.value.id}`)
  amigoAEliminar.value = null
  cargarAmigos()
}  
</script>

<template>
  <NavBar :logeado="true" />

  <!-- Cabecera -->
  <section class="container mt-5">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <h1 class="mb-1">Amigos</h1>
        <p class="text-muted mb-0">Gestiona tus amigos y solicitudes de amistad.</p>
      </div>
      <button
        v-if="tabActiva === 'amigos'"
        class="btn btn-primary"
        @click="mostrarBuscar = !mostrarBuscar"
      >
        <i class="bi bi-person-plus-fill me-1"></i> Añadir amigo
      </button>
    </div>
  </section>

  <!-- Buscador -->
  <section v-if="mostrarBuscar" class="container mt-4">
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">Buscar usuario</h5>
        <div class="d-flex gap-2 mb-3">
          <input
            v-model="nombreBusqueda"
            type="text"
            class="form-control"
            placeholder="Nombre de usuario..."
            @keyup.enter="buscarUsuario"
          />
          <button
            class="btn btn-secondary"
            @click="buscarUsuario"
            :disabled="cargandoBusqueda"
          >
            {{ cargandoBusqueda ? 'Buscando...' : 'Buscar' }}
          </button>
        </div>

        <!-- Error -->
        <div v-if="errorBusqueda" class="alert alert-warning mb-0">
          {{ errorBusqueda }}
        </div>

        <!-- Resultado -->
        <div v-if="resultadoBusqueda" class="d-flex align-items-center gap-3 p-3 border rounded">
          <img
            :src="avatarUrl(resultadoBusqueda.avatar, resultadoBusqueda.userId)"
            class="rounded-circle"
            width="42" height="42"
            alt="Avatar"
          />
          <span class="fw-semibold flex-grow-1">{{ resultadoBusqueda.nombre }}</span>

          <span v-if="esSiMismo" class="text-muted small fst-italic">Eres tú</span>
          <span v-else-if="yaEsAmigo" class="badge bg-success px-3 py-2">
            <i class="bi bi-shield-check me-1"></i>Amigo
          </span>
          <button
            v-else
            class="btn btn-success btn-sm"
            @click="enviarSolicitud(resultadoBusqueda.userId)"
            :disabled="solicitudEnviada"
          >
            <i v-if="solicitudEnviada" class="bi bi-check-lg me-1"></i>
            {{ solicitudEnviada ? 'Solicitud enviada' : 'Enviar solicitud' }}
          </button>
        </div>

      </div>
    </div>
  </section>

  <!-- Panel principal -->
  <section class="container mt-4 mb-5">
    <div class="row g-0 panel shadow-sm rounded overflow-hidden border">

      <!-- Pestañas -->
      <div class="col-12 col-md-3 pestanas-col border-end">
        <nav class="list-group list-group-flush">
          <button
            class="list-group-item list-group-item-action pestana-btn d-flex align-items-center gap-2"
            :class="{ active: tabActiva === 'amigos' }"
            @click="tabActiva = 'amigos'"
          >
            <i class="bi bi-shield-fill"></i> Amigos
          </button>
          <button
            class="list-group-item list-group-item-action pestana-btn d-flex align-items-center justify-content-between"
            :class="{ active: tabActiva === 'recibidas' }"
            @click="tabActiva = 'recibidas'"
          >
            <span class="d-flex align-items-center gap-2">
              <i class="bi bi-inbox-fill"></i> Solicitudes recibidas
            </span>
            <span v-if="recibidas.length > 0" class="badge bg-danger rounded-pill">
              {{ recibidas.length }}
            </span>
          </button>
          <button
            class="list-group-item list-group-item-action pestana-btn d-flex align-items-center gap-2"
            :class="{ active: tabActiva === 'enviadas' }"
            @click="tabActiva = 'enviadas'"
          >
            <i class="bi bi-send-fill"></i> Solicitudes enviadas
          </button>
        </nav>
      </div>

      <!-- Contenido -->
      <div class="col-12 col-md-9 lista-col">

        <!-- Cargando -->
        <div v-if="cargando" class="d-flex justify-content-center align-items-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <!-- Amigos -->
        <template v-else-if="tabActiva === 'amigos'">
          <div v-if="amigos.length === 0" class="text-center text-muted py-5">
            <i class="bi bi-people fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">Aún no tienes compañeros de aventura.</p>
          </div>
          <ul v-else class="list-unstyled m-0">
            <li
              v-for="amigo in amigos"
              :key="amigo.id"
              class="item-fila d-flex align-items-center gap-3 px-4 py-3 border-bottom"
            >
              <img
                :src="avatarUrl(amigo.avatar, amigo.id)"
                class="rounded-circle flex-shrink-0"
                width="46" height="46"
                alt="Avatar"
              />
              <div class="flex-grow-1">
                <p class="mb-0 fw-semibold">{{ amigo.nombre }}</p>
                <small class="text-muted">Amigo</small>
              </div>
                <router-link
                :to="`/perfil/${amigo.id}`"
                class="btn btn-outline-primary btn-sm"
                >
                <i class="bi bi-person me-1"></i>Ver perfil
                </router-link>
              <button class="btn btn-outline-danger btn-sm" @click="confirmarEliminar(amigo)">
                <i class="bi bi-person-dash me-1"></i>Eliminar
              </button>
            </li>
          </ul>
        </template>

        <!-- Solicitudes recibidas -->
        <template v-else-if="tabActiva === 'recibidas'">
          <div v-if="recibidas.length === 0" class="text-center text-muted py-5">
            <i class="bi bi-envelope-open fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No tienes solicitudes pendientes.</p>
          </div>
          <ul v-else class="list-unstyled m-0">
            <li
              v-for="sol in recibidas"
              :key="sol.id"
              class="item-fila d-flex align-items-center gap-3 px-4 py-3 border-bottom"
            >
              <img
                :src="avatarUrl(sol.emisorAvatar, sol.emisorId)"
                class="rounded-circle flex-shrink-0"
                width="46" height="46"
                alt="Avatar"
              />
              <div class="flex-grow-1">
                <p class="mb-0 fw-semibold">{{ sol.emisorNombre }}</p>
                <small class="text-muted">Quiere unirse a tu grupo</small>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-success btn-sm" @click="aceptarSolicitud(sol.id)">
                  <i class="bi bi-check-lg me-1"></i>Aceptar
                </button>
                <button class="btn btn-outline-secondary btn-sm" @click="rechazarSolicitud(sol.id)">
                  <i class="bi bi-x-lg me-1"></i>Rechazar
                </button>
              </div>
            </li>
          </ul>
        </template>

        <!-- Solicitudes enviadas -->
        <template v-else-if="tabActiva === 'enviadas'">
          <div v-if="enviadas.length === 0" class="text-center text-muted py-5">
            <i class="bi bi-send fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No has enviado ninguna solicitud.</p>
          </div>
          <ul v-else class="list-unstyled m-0">
            <li
              v-for="sol in enviadas"
              :key="sol.id"
              class="item-fila d-flex align-items-center gap-3 px-4 py-3 border-bottom"
            >
              <img
                :src="avatarUrl(sol.receptorAvatar, sol.receptorId)"
                class="rounded-circle flex-shrink-0"
                width="46" height="46"
                alt="Avatar"
              />
              <div class="flex-grow-1">
                <p class="mb-0 fw-semibold">{{ sol.receptorNombre }}</p>
                <small class="text-muted">
                  <span class="badge bg-warning text-dark">Pendiente</span>
                </small>
              </div>
              <button class="btn btn-outline-danger btn-sm" @click="cancelarSolicitud(sol.id)">
                <i class="bi bi-x-circle me-1"></i>Cancelar
              </button>
            </li>
          </ul>
        </template>

      </div>
    </div>
  </section>

  <!-- Modal confirmar eliminar -->
  <div v-if="amigoAEliminar" class="modal-backdrop-custom" @click.self="amigoAEliminar = null">
    <div class="modal-dialog-custom shadow-lg rounded-3 p-4">
      <h5 class="mb-2">¿Eliminar a {{ amigoAEliminar.nombre }}?</h5>
      <p class="text-muted mb-4">Esta acción no se puede deshacer.</p>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary" @click="amigoAEliminar = null">Cancelar</button>
        <button class="btn btn-danger" @click="eliminarAmigo">Confirmar</button>
      </div>
    </div>
  </div>

  <Footer />
</template>

<style scoped>
.panel {
  min-height: 480px;
  background: #fff;
}

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

.lista-col {
  overflow-y: auto;
  max-height: 600px;
}

.item-fila {
  transition: background 0.12s;
}

.item-fila:hover {
  background: #f8f9fa;
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
  max-width: 420px;
  margin: 1rem;
}
</style>
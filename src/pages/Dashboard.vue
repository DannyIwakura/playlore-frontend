<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Footer from '../components/Footer.vue';
import NavBar from '../components/NavBar.vue';
import api from '../services/api'
import { userStore } from '../store/userStore'
import 'bootstrap-icons/font/bootstrap-icons.css'
0
const amigos = ref<AmigoDTO[]>([])
const cargandoAmigos = ref(false)

const BASE_URL = 'http://localhost:8080/api'
const AVATAR_DEFECTO = `${BASE_URL}/images/AVATAR.png`
const router = useRouter()
const destinatarioFijo = ref(false)

const miId = computed(() => userStore.usuario.value?.id)

// Interfaz para datos de amigos
interface AmigoDTO {
  id: number
  nombre: string
  avatar: string | null
  ultimaConexion: string | null
}

function avatarUrl(avatar: string | null | undefined, id?: number): string {
  if (!avatar) return `https://api.dicebear.com/7.x/adventurer/svg?seed=${id ?? 0}`
  if (avatar.startsWith('http')) return avatar
  return BASE_URL + avatar
}

// Ordena por ultimaConexion desc y toma los 6 más recientes
const amigosRecientes = computed(() =>
  [...amigos.value]
    .sort((a, b) => {
      if (!a.ultimaConexion) return 1
      if (!b.ultimaConexion) return -1
      return new Date(b.ultimaConexion).getTime() - new Date(a.ultimaConexion).getTime()
    })
    .slice(0, 6)
)

function tiempoDesde(fecha: string | null): string {
  if (!fecha) return 'Nunca conectado'
  //Sacamos la diferencia de tiempo con la fecha actual
  const diff = Date.now() - new Date(fecha).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  const d    = Math.floor(diff / 86400000)
  // Calcular dias, horas y si se ha conectado hace muy poco
  if (min < 1)  return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  if (h < 24)   return `Hace ${h} h`
  if (d < 7)    return `Hace ${d} día${d > 1 ? 's' : ''}`
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

async function cargarAmigos() {
  if (!miId.value) return
  cargandoAmigos.value = true
  try {
    const { data } = await api.get(`/usuarios/${miId.value}/amigos`)
    amigos.value = data
  } catch {
    // silencioso
  } finally {
    cargandoAmigos.value = false
  }
}

const modalMensaje = ref(false)
const mensaje = ref({ receptorNombre: '', titulo: '', contenido: '' })
const enviandoMensaje = ref(false)
const destinatario = ref<AmigoDTO | null>(null)

function abrirModalMensaje(nombreDestinatario = '') {
  mensaje.value = { receptorNombre: nombreDestinatario, titulo: '', contenido: '' }
  destinatarioFijo.value = nombreDestinatario !== ''
  modalMensaje.value = true
}

async function enviarMensajePrivado() {
  if (!miId.value) return
  enviandoMensaje.value = true
  try {
    const { data: receptor } = await api.get('/usuarios/buscar', {
      params: { nombre: mensaje.value.receptorNombre }
    })
    await api.post('/mensajes/enviar', {
      emisorId:   miId.value,
      receptorId: receptor.userId,
      titulo:     mensaje.value.titulo,
      contenido:  mensaje.value.contenido
    })
    modalMensaje.value = false
    mensaje.value = { receptorNombre: '', titulo: '', contenido: '' }
  } catch (e: any) {
    if (e.response?.status === 404) {
      alert('No se encontró ningún usuario con ese nombre.')
    } else {
      alert('Error al enviar el mensaje.')
    }
  } finally {
    enviandoMensaje.value = false
  }
}

onMounted(() => {
  userStore.cargarDesdeToken()
  cargarAmigos()
})

</script>

<template>
  <NavBar :logeado="true" />

  <!-- Cabecera -->
  <section class="container mt-5">
    <h1>Bienvenido {{ userStore.usuario.value?.username }} al Dashboard</h1>
    <p>Aquí podrás gestionar tus personajes, aventuras y mensajes privados.</p>
  </section>

  <!-- Accesos rápidos -->
  <section class="container mt-4">
    <h2>Accesos rápidos</h2>
    <div class="row">

      <div class="col-md-4 mb-3">
        <router-link
          to="/personajes/crear"
          class="acceso-card text-decoration-none d-flex flex-column align-items-start p-4 rounded-3 border h-100"
        >
          <div class="acceso-icon mb-3">
            <i class="bi bi-person-plus-fill"></i>
          </div>
          <h5 class="fw-bold mb-1 text-body">Crear personaje</h5>
          <p class="text-muted small mb-0">Da vida a tu héroe, villano o aventurero con un par de clics.</p>
        </router-link>
      </div>

      <div class="col-md-4 mb-3">
        <button
          class="acceso-card btn d-flex flex-column align-items-start p-4 rounded-3 border h-100 w-100 text-start"
          @click="abrirModalMensaje()"
        >
          <div class="acceso-icon mb-3">
            <i class="bi bi-envelope-fill"></i>
          </div>
          <h5 class="fw-bold mb-1 text-body">Enviar mensaje</h5>
          <p class="text-muted small mb-0">Escribe en privado a cualquier miembro de la comunidad.</p>
        </button>
      </div>

    </div>
  </section>

  <!-- Amigos recientes -->
  <section class="container mt-4">
    <h2>Amigos recientesmente conectados</h2>

    <div v-if="cargandoAmigos" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="amigosRecientes.length === 0" class="text-center text-muted py-4">
      <i class="bi bi-people fs-1 d-block mb-2 opacity-50"></i>
      <p class="mb-0">Aún no tienes compañeros de aventura.</p>
    </div>

    <div v-else class="row">
      <div
        v-for="amigo in amigosRecientes"
        :key="amigo.id"
        class="col-md-4 mb-3"
      >
        <div class="card">
          <div class="card-body d-flex align-items-center gap-3">
            <img
              :src="avatarUrl(amigo.avatar, amigo.id)"
              class="rounded-circle flex-shrink-0"
              width="48" height="48"
              style="object-fit: cover;"
              alt="Avatar"
            />
            <div class="flex-grow-1 min-w-0">
              <h5 class="card-title mb-0 text-truncate">{{ amigo.nombre }}</h5>
              <small class="text-muted">{{ tiempoDesde(amigo.ultimaConexion) }}</small>
            </div>
            <div class="d-flex flex-column gap-1">
              <router-link :to="`/perfil/${amigo.id}`" class="btn btn-outline-primary btn-sm" title="Ver perfil">
                <i class="bi bi-person"></i>
              </router-link>
              <button class="btn btn-outline-secondary btn-sm" title="Enviar mensaje" @click="abrirModalMensaje(amigo.nombre)">
                <i class="bi bi-envelope"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal mensaje -->
  <div v-if="modalMensaje" class="modal-backdrop-custom" @click.self="modalMensaje = false">
    <div class="modal-dialog-custom shadow-lg rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Nuevo mensaje</h5>
        <button class="btn-close" @click="modalMensaje = false"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Nombre del destinatario</label>
        <input
          v-model="mensaje.receptorNombre"
          type="text"
          class="form-control"
          placeholder="Nombre del usuario"
          :disabled="destinatarioFijo"
        />
      </div>
      <div class="mb-3">
        <label class="form-label">Asunto</label>
        <input v-model="mensaje.titulo" type="text" class="form-control" maxlength="150" placeholder="Asunto del mensaje" />
      </div>
      <div class="mb-4">
        <label class="form-label">Mensaje</label>
        <textarea v-model="mensaje.contenido" class="form-control" rows="5" maxlength="2000" placeholder="Escribe tu mensaje aquí..."></textarea>
        <div class="text-end text-muted small mt-1">{{ mensaje.contenido.length }}/2000</div>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary" @click="modalMensaje = false">Cancelar</button>
        <button
          class="btn btn-primary"
          :disabled="enviandoMensaje || !mensaje.receptorNombre || !mensaje.contenido"
          @click="enviarMensajePrivado"
        >
          <span v-if="enviandoMensaje" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-send me-1"></i>
          Enviar
        </button>
      </div>
    </div>
  </div>

  <Footer :logeado="true" />
</template>

<style scoped>
/* Accesos rápidos */
.acceso-card {
  background: #fff;
  transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
  border-color: #dee2e6 !important;
  cursor: pointer;
}
.acceso-card:hover {
  box-shadow: 0 4px 18px rgba(13, 110, 253, 0.10);
  transform: translateY(-2px);
  border-color: #0d6efd !important;
}

.acceso-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #e7f0ff;
  color: #0d6efd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

/* Tarjetas de amigos */
.amigo-card {
  transition: box-shadow 0.15s;
}
.amigo-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

/* Modal */
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

.min-w-0 { min-width: 0; }
</style>
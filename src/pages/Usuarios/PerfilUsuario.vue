<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import { userStore } from '../../store/userStore'
import axios from '../../services/api'

const AVATAR_DEFECTO = `${import.meta.env.VITE_ASSET_URL}/api/images/AVATAR.png`

interface UsuarioDTO {
  userId: number
  nombre: string
  email: string
  avatar: string
  rol: string
  fechaRegistro: string
  ultimaConexion: string
}

const route = useRoute()
const perfil = ref<UsuarioDTO | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

// Modal mensaje
const modalMensaje = ref(false)
const mensaje = ref({ titulo: '', contenido: '' })
const enviandoMensaje = ref(false)

// Manejo de solicitud amistad
const solicitudEnviada = ref(false)
const esAmigo = ref(false)
const enviandoSolicitud = ref(false)

const userId = () => userStore.usuario.value?.id

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png') || avatar.includes('default.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) return avatar

  return `${import.meta.env.VITE_API_URL}${avatar}`
}

function formatFecha(fecha: string): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function cargarPerfil() {
  const id = route.params.id
  cargando.value = true
  error.value = null
  try {
    const { data } = await axios.get<UsuarioDTO>(`/usuarios/${id}`)
    perfil.value = data

    // Comprobar si ya existe solicitud pendiente
    const miId = userId()
    if (miId && data.userId !== miId) {
      const receptorId = data.userId

      const [resSolicitud, resAmigos] = await Promise.all([
        axios.get<boolean>(`/amistades/comprobar-existencia/${miId}/${receptorId}`),
        axios.get<any[]>(`/usuarios/${miId}/amigos`)
      ])

      solicitudEnviada.value = resSolicitud.data

      esAmigo.value = resAmigos.data.some(
        (a: any) => a.id === receptorId
      )
    }
  } catch {
    error.value = 'No se pudo cargar el perfil.'
  } finally {
    cargando.value = false
  }
}

async function enviarSolicitudAmistad() {
  const miId = userId()
  if (!miId || !perfil.value) return
  enviandoSolicitud.value = true
    console.log("Emisor (Yo):", miId, typeof miId);
    console.log("Receptor (Perfil):", perfil.value.userId, typeof perfil.value.userId);
  try {
    await axios.post('/amistades', {
      emisorId: miId,
      receptorId: perfil.value.userId
    })
    solicitudEnviada.value = true
  } catch {
    alert('No se pudo enviar la solicitud.')
  } finally {
    enviandoSolicitud.value = false
  }
}

async function enviarMensajePrivado() {
  const miId = userId()
  if (!miId || !perfil.value) return
  enviandoMensaje.value = true
  try {
    await axios.post('/mensajes/enviar', {
      emisorId: miId,
      receptorId: perfil.value.userId,
      titulo: mensaje.value.titulo,
      contenido: mensaje.value.contenido
    })
    modalMensaje.value = false
    mensaje.value = { titulo: '', contenido: '' }
  } catch {
    alert('Error al enviar el mensaje.')
  } finally {
    enviandoMensaje.value = false
  }
}

// No mostrar botones si es el propio usuario
const esPropioUsuario = () => userId() === perfil.value?.userId

onMounted(async () => {
  await userStore.cargarDesdeToken()
  cargarPerfil()
})
</script>

<template>
  <NavBar :logeado="true" />

  <section class="container mt-5 mb-5" style="max-width: 860px;">

    <div v-if="cargando" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="perfil" class="card border rounded-3 overflow-hidden shadow-sm">

      <!-- Cabecera con avatar y acciones -->
      <div class="card-header bg-light p-4 d-flex align-items-center gap-4 border-bottom">
        <img
          :src="avatarUrl(perfil.avatar, perfil.userId)"
          class="rounded-circle flex-shrink-0"
          width="96" height="96"
          style="object-fit: cover; border: 2px solid #dee2e6;"
          alt="Avatar"
        />
        <div>
          <h2 class="mb-1 fs-4">{{ perfil.nombre }}</h2>
          <span class="badge bg-primary bg-opacity-10 text-primary fw-normal">{{ perfil.rol }}</span>

          <!-- Botones solo si no es el propio usuario -->
          <div v-if="!esPropioUsuario()" class="d-flex gap-2 mt-3 flex-wrap">
            <button class="btn btn-primary btn-sm" @click="modalMensaje = true">
              <i class="bi bi-envelope me-1"></i> Enviar mensaje
            </button>
            <button
              v-if="!esAmigo"
              class="btn btn-outline-secondary btn-sm"
              :disabled="solicitudEnviada || enviandoSolicitud"
              @click="enviarSolicitudAmistad"
            >
              <span v-if="enviandoSolicitud" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else-if="solicitudEnviada" class="bi bi-check2 me-1"></i>
              <i v-else class="bi bi-person-plus me-1"></i>
              {{ solicitudEnviada ? 'Solicitud enviada' : 'Solicitud de amistad' }}
            </button>

            <span v-else class="badge bg-success px-3 py-2">
              <i class="bi bi-shield-check me-1"></i>Amigo
            </span>
          </div>
        </div>
      </div>

      <!-- Datos del perfil -->
      <div class="card-body p-0">
        <div class="row g-0">
          <div class="col-6 p-4 border-bottom border-end">
            <p class="text-muted small mb-1" style="font-size: 11px; text-transform: uppercase; letter-spacing: .05em;">Nombre</p>
            <p class="mb-0">{{ perfil.nombre }}</p>
          </div>
          <div class="col-6 p-4 border-bottom">
            <p class="text-muted small mb-1" style="font-size: 11px; text-transform: uppercase; letter-spacing: .05em;">Email</p>
            <p class="mb-0">{{ perfil.email }}</p>
          </div>
          <div class="col-6 p-4 border-end">
            <p class="text-muted small mb-1" style="font-size: 11px; text-transform: uppercase; letter-spacing: .05em;">Miembro desde</p>
            <p class="mb-0">{{ formatFecha(perfil.fechaRegistro) }}</p>
          </div>
          <div class="col-6 p-4">
            <p class="text-muted small mb-1" style="font-size: 11px; text-transform: uppercase; letter-spacing: .05em;">Última conexión</p>
            <p class="mb-0">{{ formatFecha(perfil.ultimaConexion) }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal: Enviar mensaje -->
  <div v-if="modalMensaje" class="modal-backdrop-custom" @click.self="modalMensaje = false">
    <div class="modal-dialog-custom shadow-lg rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Nuevo mensaje</h5>
        <button class="btn-close" @click="modalMensaje = false"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Destinatario</label>
        <input :value="perfil?.nombre" type="text" class="form-control" disabled />
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
          :disabled="enviandoMensaje || !mensaje.contenido"
          @click="enviarMensajePrivado"
        >
          <span v-if="enviandoMensaje" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-send me-1"></i>
          Enviar
        </button>
      </div>
    </div>
  </div>

  <Footer />
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
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
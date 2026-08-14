<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import { userStore } from '../../store/userStore'
import axios from '../../services/api'
import ModalAviso from '../../components/ModalAviso.vue'

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

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

const aviso = ref<string | null>(null)

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
  try {
    await axios.post('/amistades', {
      emisorId: miId,
      receptorId: perfil.value.userId
    })
    solicitudEnviada.value = true
  } catch {
    aviso.value = 'No se pudo enviar la solicitud.'
  } finally {
    enviandoSolicitud.value = false
  }
}

// --- Denunciar perfil ---
const modalDenuncia = ref(false)
const denuncia = ref({ motivo: '', detalle: '' })
const enviandoDenuncia = ref(false)

async function enviarDenuncia() {
  if (!perfil.value) return
  if (!denuncia.value.motivo.trim()) {
    aviso.value = 'El motivo es obligatorio para enviar la denuncia.'
    return
  }
  enviandoDenuncia.value = true
  try {
    await axios.post('/denuncias', {
      tipo: 'USUARIO',
      tipoId: perfil.value.userId,
      motivo: denuncia.value.motivo.trim(),
      detalle: denuncia.value.detalle.trim() || null,
    })
    modalDenuncia.value = false
    denuncia.value = { motivo: '', detalle: '' }
    aviso.value = 'Denuncia enviada. Gracias por ayudar a mantener la comunidad segura.'
  } catch (e: any) {
    const data = e?.response?.data
    aviso.value = data?.error || data?.message || data?.mensaje || 'Error al enviar la denuncia.'
  } finally {
    enviandoDenuncia.value = false
  }
}

// --- Banear usuario (solo ADMIN/MOD) ---
const modalBaneo = ref(false)
const baneo = ref({ duracion: 'PERMANENTE', motivo: '' })
const baneando = ref(false)

const opcionesDuracion = [
  { value: '1H', label: '1 hora' },
  { value: '24H', label: '24 horas' },
  { value: '7D', label: '7 días' },
  { value: 'PERMANENTE', label: 'Permanente' },
]

const esModerador = () => {
  const rol = userStore.usuario.value?.role
  return rol === 'ADMIN' || rol === 'MOD'
}

async function banearUsuario() {
  if (!perfil.value) return
  const dur = baneo.value.duracion
  baneando.value = true
  try {
    await axios.post('/moderacion/baneos', {
      tipo: 'USUARIO',
      id: perfil.value.userId,
      duracion: baneo.value.duracion,
      motivo: baneo.value.motivo.trim() || null,
    })
    modalBaneo.value = false
    baneo.value = { duracion: 'PERMANENTE', motivo: '' }
    aviso.value = `Usuario baneado${dur !== 'PERMANENTE' ? ' temporalmente' : ''}.`
  } catch (e: any) {
    const data = e?.response?.data
    aviso.value = data?.error || data?.message || data?.mensaje || 'Error al banear al usuario.'
  } finally {
    baneando.value = false
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
            <router-link to="/chat" target="_blank" class="btn btn-primary btn-sm">
              <i class="bi bi-chat-dots me-1"></i> Chatear
            </router-link>
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

            <button class="btn btn-outline-danger btn-sm" @click="modalDenuncia = true">
              <i class="bi bi-flag me-1"></i> Denunciar
            </button>
            <button v-if="esModerador()" class="btn btn-danger btn-sm" @click="modalBaneo = true">
              <i class="bi bi-hammer me-1"></i> Banear
            </button>
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

  <!-- Modal: Denunciar usuario -->
  <div v-if="modalDenuncia" class="modal-backdrop-custom" @click.self="modalDenuncia = false">
    <div class="modal-dialog-custom shadow-lg rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Denunciar a {{ perfil?.nombre }}</h5>
        <button class="btn-close" @click="modalDenuncia = false"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Motivo <span class="text-danger">*</span></label>
        <input v-model="denuncia.motivo" type="text" class="form-control" maxlength="200" placeholder="¿Por qué lo denuncias?" />
      </div>
      <div class="mb-4">
        <label class="form-label">Detalle (opcional)</label>
        <textarea v-model="denuncia.detalle" class="form-control" rows="4" maxlength="2000" placeholder="Amplía la información si lo necesitas..."></textarea>
        <div class="text-end text-muted small mt-1">{{ denuncia.detalle.length }}/2000</div>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary" @click="modalDenuncia = false">Cancelar</button>
        <button
          class="btn btn-outline-danger"
          :disabled="enviandoDenuncia || !denuncia.motivo.trim()"
          @click="enviarDenuncia"
        >
          <span v-if="enviandoDenuncia" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-flag me-1"></i>
          Enviar denuncia
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Banear usuario -->
  <div v-if="modalBaneo" class="modal-backdrop-custom" @click.self="modalBaneo = false">
    <div class="modal-dialog-custom shadow-lg rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Banear a {{ perfil?.nombre }}</h5>
        <button class="btn-close" @click="modalBaneo = false"></button>
      </div>
      <div class="mb-3">
        <label class="form-label">Duración</label>
        <select v-model="baneo.duracion" class="form-select">
          <option v-for="op in opcionesDuracion" :key="op.value" :value="op.value">
            {{ op.label }}
          </option>
        </select>
      </div>
      <div class="mb-4">
        <label class="form-label">Motivo (opcional)</label>
        <input v-model="baneo.motivo" type="text" class="form-control" maxlength="300" placeholder="Motivo del baneo" />
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary" @click="modalBaneo = false">Cancelar</button>
        <button
          class="btn btn-danger"
          :disabled="baneando"
          @click="banearUsuario"
        >
          <span v-if="baneando" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-hammer me-1"></i>
          Banear
        </button>
      </div>
    </div>
  </div>

  <Footer />

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.modal-dialog-custom {
  background: #fff;
  width: 100%;
  max-width: 520px;
  margin: 1rem;
}
</style>
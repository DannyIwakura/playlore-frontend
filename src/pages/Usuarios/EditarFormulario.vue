<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import { userStore } from '../../store/userStore'
import api from '../../services/api'

const BASE_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`
const router = useRouter()

const miId = computed(() => userStore.usuario.value?.id)

// Estado del formulario
const nombre  = ref('')
const email   = ref('')
const avatarActual = ref<string | null>(null)

// Avatar nuevo
const avatarFile    = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const inputAvatar   = ref<HTMLInputElement | null>(null)

// UI
const cargando  = ref(true)
const guardando = ref(false)
const error     = ref<string | null>(null)
const exito     = ref(false)

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) {
    return avatar
  }

  return BASE_URL + avatar
}

function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

function quitarAvatar() {
  avatarFile.value = null
  avatarPreview.value = null
  if (inputAvatar.value) inputAvatar.value.value = ''
}

async function cargarDatos() {
  cargando.value = true
  try {
    const res = await api.get(`/usuarios/${miId.value}`)
    nombre.value       = res.data.nombre
    email.value        = res.data.email
    avatarActual.value = res.data.avatar
  } catch {
    error.value = 'No se pudieron cargar los datos del perfil.'
  } finally {
    cargando.value = false
  }
}

async function guardar() {
  error.value = null
  exito.value = false
  guardando.value = true

  try {
    const formData = new FormData()
    const usuarioBlob = new Blob([JSON.stringify({
      userId: miId.value,
      nombre: nombre.value,
      email:  email.value,
      avatar: avatarActual.value,
      fechaRegistro: null,
      ultimaConexion: null
    })], { type: 'application/json' })

    formData.append('usuario', usuarioBlob)
    if (avatarFile.value) formData.append('avatarFile', avatarFile.value)

    const res = await api.put(`/usuarios/${miId.value}`, formData)
    console.log('Respuesta PUT:', res.status, res.data)

    await cargarDatos()

    //debemos actualizar el store para que el cambio se refleje en toda la app
    if (userStore.usuario.value) {
    userStore.usuario.value = {
      ...userStore.usuario.value,
      username: nombre.value,
      avatar: avatarActual.value ?? userStore.usuario.value.avatar
    }
}
  } catch (e: any) {
    console.error('Error status:', e.response?.status)
    console.error('Error data:', e.response?.data)
    console.error('Error completo:', e)
  } finally {
    guardando.value = false
  }
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  cargarDatos()
})
</script>

<template>
  <NavBar :logeado="true" />

  <section class="container mt-5 mb-5" style="max-width: 680px;">
    <h1 class="mb-1">Editar perfil</h1>
    <p class="text-muted mb-4">Actualiza tu nombre, email o avatar.</p>

    <!-- Cargando -->
    <div v-if="cargando" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else class="card border shadow-sm rounded-3 overflow-hidden">

      <!-- Avatar -->
      <div class="card-header bg-light p-4 d-flex align-items-center gap-4 border-bottom">
        <div class="position-relative">
          <img
            :src="avatarPreview ?? avatarUrl(avatarActual)"
            class="rounded-circle"
            width="96" height="96"
            style="object-fit: cover; border: 2px solid #dee2e6;"
            alt="Avatar"
          />
          <!-- Overlay de edición -->
          <button
            class="btn-avatar-edit"
            title="Cambiar avatar"
            @click="inputAvatar?.click()"
          >
            <i class="bi bi-camera-fill"></i>
          </button>
        </div>

        <div>
          <p class="mb-1 fw-semibold">{{ nombre }}</p>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-outline-secondary btn-sm" @click="inputAvatar?.click()">
              <i class="bi bi-upload me-1"></i>Subir imagen
            </button>
            <button
              v-if="avatarPreview"
              class="btn btn-outline-danger btn-sm"
              @click="quitarAvatar"
            >
              <i class="bi bi-x-lg me-1"></i>Quitar
            </button>
          </div>
          <small class="text-muted d-block mt-1">JPG, PNG o WEBP Máx. 2 MB. 200x200 px</small>
          <input
            ref="inputAvatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="d-none"
            @change="onAvatarChange"
          />
        </div>
      </div>

      <!-- Formulario -->
      <div class="card-body p-4">

        <div class="mb-3">
          <label class="form-label fw-semibold">Nombre de usuario</label>
          <input
            v-model="nombre"
            type="text"
            class="form-control"
            maxlength="50"
            placeholder="Tu nombre"
          />
        </div>

        <div class="mb-4">
          <label class="form-label fw-semibold">Email</label>
          <input
            v-model="email"
            type="email"
            class="form-control"
            placeholder="tu@email.com"
          />
        </div>

        <!-- Feedback -->
        <div v-if="error" class="alert alert-danger py-2">
          <i class="bi bi-exclamation-circle me-1"></i>{{ error }}
        </div>
        <div v-if="exito" class="alert alert-success py-2">
          <i class="bi bi-check-circle me-1"></i>Perfil actualizado correctamente.
        </div>

        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-outline-secondary" @click="router.back()">
            Cancelar
          </button>
          <button
            class="btn btn-primary"
            @click="guardar"
            :disabled="guardando || !nombre.trim() || !email.trim()"
          >
            <span v-if="guardando" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-floppy me-1"></i>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  </section>

  <Footer />
</template>

<style scoped>
.btn-avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #0d6efd;
  color: #fff;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-avatar-edit:hover {
  background: #0b5ed7;
}
</style>
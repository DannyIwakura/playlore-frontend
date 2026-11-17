<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import ModalConfirmacion from '../../components/ModalConfirmacion.vue'
import ModalInput from '../../components/ModalInput.vue'
import { userStore } from '../../store/userStore'
import api from '../../services/api'
import { enfocarPrimerError } from '../../composables/useFocoPrimerError'

const BASE_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`
const TIPOS_AVATAR = ['image/jpeg', 'image/png', 'image/webp']
const TAMANIO_MAXIMO_AVATAR = 2 * 1024 * 1024
const LADO_MAXIMO_AVATAR = 200
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const router = useRouter()

const miId = computed(() => userStore.usuario.value?.id)

// Estado del formulario
const nombre = ref('')
const email = ref('')
const avatarActual = ref<string | null>(null)

// Avatar nuevo
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const inputAvatar = ref<HTMLInputElement | null>(null)

// UI
const cargando = ref(true)
const guardando = ref(false)
const error = ref<string | null>(null)
const errorGeneral = ref('')
const exito = ref(false)
const errores = reactive<Record<string, string>>({})
const formRef = ref<HTMLFormElement | null>(null)

// Eliminación de cuenta
const confirmarEliminacion = ref(false)
const pedirPassword = ref(false)
const eliminando = ref(false)
const errorEliminar = ref<string | null>(null)

async function eliminarCuenta(password: string) {
  errorEliminar.value = null
  eliminando.value = true
  try {
    await api.delete(`/usuarios/${miId.value}`, { data: { password } })
    localStorage.removeItem('token')
    userStore.setUsuario(null)
    router.push('/login')
  } catch (e: any) {
    errorEliminar.value = e.response?.data?.error ?? 'No se pudo eliminar la cuenta.'
    eliminando.value = false
  }
}

function confirmarPrimerPaso() {
  confirmarEliminacion.value = false
  pedirPassword.value = true
}

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) {
    return avatar
  }

  return BASE_URL + avatar
}

function revocarPreview() {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = null
  }
}

function comprobarDimensiones(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const imagen = new Image()
    imagen.onload = () => {
      URL.revokeObjectURL(url)
      resolve(imagen.naturalWidth <= LADO_MAXIMO_AVATAR && imagen.naturalHeight <= LADO_MAXIMO_AVATAR)
    }
    imagen.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(false)
    }
    imagen.src = url
  })
}

async function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  delete errores.avatarFile
  errorGeneral.value = ''
  exito.value = false
  if (!file) return

  // Si la imagen nueva no vale, no se conserva la anterior como si fuera la elegida.
  revocarPreview()
  avatarFile.value = null

  if (!TIPOS_AVATAR.includes(file.type)) {
    errores.avatarFile = 'El avatar debe ser JPG, PNG o WEBP.'
    input.value = ''
    return
  }

  if (file.size > TAMANIO_MAXIMO_AVATAR) {
    errores.avatarFile = 'El avatar no puede superar 2 MB.'
    input.value = ''
    return
  }

  if (!(await comprobarDimensiones(file))) {
    errores.avatarFile = `El avatar no puede superar ${LADO_MAXIMO_AVATAR}x${LADO_MAXIMO_AVATAR} px.`
    input.value = ''
    return
  }

  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

function quitarAvatar() {
  avatarFile.value = null
  revocarPreview()
  delete errores.avatarFile
  if (inputAvatar.value) inputAvatar.value.value = ''
}

function onCampoEditado(campo: 'nombre' | 'email') {
  delete errores[campo]
  errorGeneral.value = ''
  exito.value = false
}

async function cargarDatos() {
  cargando.value = true
  error.value = null
  try {
    const res = await api.get(`/usuarios/${miId.value}`)
    nombre.value = res.data.nombre
    email.value = res.data.email
    avatarActual.value = res.data.avatar
  } catch {
    error.value = 'No se pudieron cargar los datos del perfil.'
  } finally {
    cargando.value = false
  }
}

function validarFormulario(): boolean {
  let valido = true

  if (!nombre.value.trim()) {
    errores.nombre = 'El nombre de usuario es obligatorio.'
    valido = false
  }

  const emailLimpio = email.value.trim()
  if (!emailLimpio) {
    errores.email = 'El email es obligatorio.'
    valido = false
  } else if (!PATRON_EMAIL.test(emailLimpio)) {
    errores.email = 'Introduce un email válido.'
    valido = false
  }

  return valido
}

function aplicarErroresBackend(data: any) {
  let asignado = false

  for (const campo of ['nombre', 'email', 'avatarFile']) {
    if (typeof data?.[campo] === 'string') {
      errores[campo] = data[campo]
      asignado = true
    }
  }

  const mensaje = data?.error || data?.message || data?.mensaje
  if (mensaje) {
    if (/email/i.test(mensaje)) {
      errores.email = mensaje
      asignado = true
    } else if (/avatar|imagen/i.test(mensaje)) {
      errores.avatarFile = mensaje
      asignado = true
    } else {
      errorGeneral.value = mensaje
    }
  }

  if (!asignado && !errorGeneral.value) {
    errorGeneral.value = 'No se pudo guardar el perfil. Inténtalo de nuevo.'
  }
}

async function guardar() {
  errorGeneral.value = ''
  exito.value = false
  Object.keys(errores).forEach((clave) => delete errores[clave])

  if (!validarFormulario()) {
    await enfocarPrimerError(formRef.value)
    return
  }

  guardando.value = true

  try {
    const formData = new FormData()
    const usuarioBlob = new Blob([JSON.stringify({
      userId: miId.value,
      nombre: nombre.value.trim(),
      email: email.value.trim(),
      avatar: avatarActual.value,
      fechaRegistro: null,
      ultimaConexion: null,
    })], { type: 'application/json' })

    formData.append('usuario', usuarioBlob)
    if (avatarFile.value) formData.append('avatarFile', avatarFile.value)

    const { data } = await api.put(`/usuarios/${miId.value}`, formData)

    nombre.value = data.nombre
    email.value = data.email
    avatarActual.value = data.avatar
    quitarAvatar()

    // El nombre y el avatar se usan en toda la app: se refresca el store.
    if (userStore.usuario.value) {
      userStore.usuario.value = {
        ...userStore.usuario.value,
        username: data.nombre,
        avatar: data.avatar ?? userStore.usuario.value.avatar,
      }
    }

    exito.value = true
  } catch (e: any) {
    aplicarErroresBackend(e?.response?.data)
    await enfocarPrimerError(formRef.value)
  } finally {
    guardando.value = false
  }
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  await cargarDatos()
})

onUnmounted(revocarPreview)
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container editar">
      <header class="pl-page-header">
        <span class="pl-kicker">Mi cuenta</span>
        <h1 class="pl-page-title">Editar perfil</h1>
        <p class="pl-lead">Actualiza tu nombre, tu email o tu avatar. Los cambios se ven en toda la comunidad.</p>
      </header>

      <div v-if="cargando" class="pl-empty-state pl-empty-state--compact" role="status">
        <div class="spinner-border text-primary" aria-hidden="true"></div>
        <span>Cargando tus datos...</span>
      </div>

      <div v-else-if="error" class="pl-alert pl-alert--danger" role="alert">
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
        <span class="flex-grow-1">{{ error }}</span>
        <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="cargarDatos">Reintentar</button>
      </div>

      <template v-else>
        <form ref="formRef" novalidate @submit.prevent="guardar" :aria-busy="guardando || undefined">
          <section class="pl-card editar-card" aria-labelledby="datos-titulo">
            <div class="editar-avatar">
              <img
                :src="avatarPreview ?? avatarUrl(avatarActual)"
                class="pl-avatar editar-avatar__imagen"
                width="96"
                height="96"
                :alt="avatarPreview ? 'Vista previa del nuevo avatar' : 'Tu avatar actual'"
              />
              <div class="editar-avatar__info">
                <h2 id="datos-titulo" class="editar-avatar__nombre">{{ nombre || 'Tu nombre' }}</h2>
                <div class="editar-avatar__acciones">
                  <button
                    type="button"
                    class="pl-btn pl-btn--secondary pl-btn--sm"
                    :aria-describedby="errores.avatarFile ? 'avatar-hint avatar-error' : 'avatar-hint'"
                    @click="inputAvatar?.click()"
                  >
                    <i class="bi bi-upload" aria-hidden="true"></i>Subir imagen
                  </button>
                  <button
                    v-if="avatarPreview"
                    type="button"
                    class="pl-btn pl-btn--danger-ghost pl-btn--sm"
                    @click="quitarAvatar"
                  >
                    <i class="bi bi-x-lg" aria-hidden="true"></i>Quitar
                  </button>
                </div>
                <p id="avatar-hint" class="pl-field__hint">JPG, PNG o WEBP. Máx. 2 MB y 200x200 px.</p>
                <p v-if="errores.avatarFile" id="avatar-error" class="pl-field__error">
                  <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.avatarFile }}
                </p>
                <input
                  ref="inputAvatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="d-none"
                  @change="onAvatarChange"
                />
              </div>
            </div>

            <div class="editar-campos">
              <div class="pl-field">
                <label class="form-label" for="perfil-nombre">Nombre de usuario</label>
                <input
                  id="perfil-nombre"
                  v-model="nombre"
                  type="text"
                  class="form-control"
                  maxlength="50"
                  autocomplete="username"
                  placeholder="Tu nombre"
                  required
                  :aria-invalid="errores.nombre ? 'true' : undefined"
                  :aria-describedby="errores.nombre ? 'perfil-nombre-error' : undefined"
                  @input="onCampoEditado('nombre')"
                />
                <p v-if="errores.nombre" id="perfil-nombre-error" class="pl-field__error">
                  <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.nombre }}
                </p>
              </div>

              <div class="pl-field">
                <label class="form-label" for="perfil-email">Email</label>
                <input
                  id="perfil-email"
                  v-model="email"
                  type="email"
                  class="form-control"
                  autocomplete="email"
                  placeholder="tu@email.com"
                  required
                  :aria-invalid="errores.email ? 'true' : undefined"
                  :aria-describedby="errores.email ? 'perfil-email-error' : undefined"
                  @input="onCampoEditado('email')"
                />
                <p v-if="errores.email" id="perfil-email-error" class="pl-field__error">
                  <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.email }}
                </p>
              </div>

              <div v-if="errorGeneral" class="pl-alert pl-alert--danger" role="alert">
                <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errorGeneral }}
              </div>

              <div v-if="exito" class="pl-alert pl-alert--success" role="status">
                <i class="bi bi-check-circle-fill" aria-hidden="true"></i>Perfil actualizado correctamente.
              </div>

              <div class="editar-acciones">
                <button type="button" class="pl-btn pl-btn--secondary" @click="router.back()">Cancelar</button>
                <button type="submit" class="pl-btn pl-btn--primary" :disabled="guardando">
                  <span v-if="guardando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                  <i v-else class="bi bi-floppy" aria-hidden="true"></i>
                  {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
                </button>
              </div>
            </div>
          </section>
        </form>

        <section class="pl-card zona-peligro" aria-labelledby="peligro-titulo">
          <div class="zona-peligro__cabecera">
            <span class="pl-icon-tile pl-icon-tile--danger" aria-hidden="true">
              <i class="bi bi-exclamation-octagon"></i>
            </span>
            <div>
              <h2 id="peligro-titulo" class="h5 mb-1">Zona de peligro</h2>
              <p class="mb-0 text-muted">
                Al eliminar tu cuenta se borrarán definitivamente tu perfil, tus personajes, sus mensajes,
                canales e imágenes asociadas. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <div v-if="errorEliminar" class="pl-alert pl-alert--danger" role="alert">
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errorEliminar }}
          </div>

          <button
            type="button"
            class="pl-btn pl-btn--danger"
            :disabled="eliminando"
            @click="confirmarEliminacion = true"
          >
            <span v-if="eliminando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-trash3" aria-hidden="true"></i>
            Eliminar mi cuenta
          </button>
        </section>
      </template>
    </div>
  </main>

  <ModalConfirmacion
    v-if="confirmarEliminacion"
    titulo="Eliminar cuenta"
    mensaje="¿Seguro que quieres eliminar tu cuenta? Se borrarán todos tus datos (personajes, mensajes, canales e imágenes) de forma permanente.\n\nEsta acción no se puede deshacer."
    botonConfirmar="Continuar"
    peligro
    @confirmar="confirmarPrimerPaso"
    @cancelar="confirmarEliminacion = false"
  />

  <ModalInput
    v-if="pedirPassword"
    titulo="Confirmar con contraseña"
    mensaje="Introduce tu contraseña para eliminar la cuenta de forma definitiva."
    etiqueta="Contraseña"
    type="password"
    botonConfirmar="Eliminar definitivamente"
    @confirmar="(password: string) => { pedirPassword = false; eliminarCuenta(password) }"
    @cancelar="pedirPassword = false"
  />

  <Footer />
</template>

<style scoped>
.editar {
  max-width: 760px;
}

.editar-card {
  overflow: hidden;
}

.editar-avatar {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--pl-border);
  background: linear-gradient(180deg, rgba(var(--pl-primary-rgb), 0.05), transparent);
}

.editar-avatar__imagen {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px #fff, 0 0 0 5px var(--pl-border);
}

.editar-avatar__info {
  min-width: 0;
}

.editar-avatar__nombre {
  margin-bottom: 0.55rem;
  color: var(--pl-ink);
  font-size: 1.1rem;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.editar-avatar__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.editar-campos {
  padding: 1.5rem;
}

.editar-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.zona-peligro {
  margin-top: 2rem;
  padding: 1.5rem;
  border-color: rgba(var(--pl-danger-rgb), 0.32);
  box-shadow: 0 1px 2px rgba(var(--pl-danger-rgb), 0.06);
}

.zona-peligro__cabecera {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.zona-peligro__cabecera .pl-icon-tile {
  margin-bottom: 0;
}

@media (max-width: 575.98px) {
  .editar-avatar {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem;
  }

  .editar-campos {
    padding: 1.25rem;
  }

  .editar-acciones {
    flex-direction: column-reverse;
  }

  .editar-acciones .pl-btn,
  .zona-peligro .pl-btn {
    width: 100%;
  }

  .zona-peligro {
    padding: 1.25rem;
  }

  .zona-peligro__cabecera {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>

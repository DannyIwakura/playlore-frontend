<script setup lang="ts">
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
import ReCaptcha from '../components/ReCaptcha.vue'
import { ref } from 'vue'
import api from '../services/api'
import { useRouter } from 'vue-router'
import { enfocarPrimerError } from '../composables/useFocoPrimerError'

const router = useRouter()
const nombre = ref('')
const email = ref('')
const password = ref('')
const errores = ref<Record<string, string>>({})
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const captchaRef = ref<InstanceType<typeof ReCaptcha> | null>(null)
const formRef = ref<HTMLFormElement | null>(null)
const enviando = ref(false)

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement

  if (target.files && target.files[0]) {
    avatarFile.value = target.files[0]
    avatarPreview.value = URL.createObjectURL(target.files[0])
  }
}

const registrarUsuario = async () => {
  errores.value = {}
  enviando.value = true

  try {
    const captchaToken = await captchaRef.value?.getToken()
    const formData = new FormData()
    const usuario = {
      nombre: nombre.value,
      email: email.value,
      password: password.value,
      captchaToken,
    }

    formData.append('usuario', new Blob([JSON.stringify(usuario)], { type: 'application/json' }))

    if (avatarFile.value) {
      formData.append('avatarFile', avatarFile.value)
    }

    await api.post('/usuarios', formData)

    router.push({
      path: '/login',
      query: { registro: 'ok' },
    })
  } catch (error: any) {
    captchaRef.value?.reset()

    if (error === 'Por favor, completa el CAPTCHA') {
      errores.value = { captcha: error }
    } else if (error.response?.status === 400) {
      errores.value = error.response.data
    } else {
      errores.value = { general: 'No se pudo crear la cuenta. Inténtalo de nuevo.' }
    }

    await enfocarPrimerError(formRef.value)
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <NavBar :logeado="false" />

  <main class="auth-layout">
    <section class="auth-visual" aria-label="Presentación de PlayLore">
      <div class="auth-visual-content">
        <span class="pl-kicker pl-kicker--light">Crea tu historia</span>
        <h2>Convierte tu imaginación en personaje</h2>
        <p>
          Únete a una comunidad creativa, comparte tu estilo y empieza a escribir historias con otros usuarios.
        </p>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <span class="pl-kicker">Nuevo usuario</span>
        <h1 class="auth-heading">Crear cuenta</h1>
        <p class="auth-subtitle">Completa tus datos para entrar en PlayLore.</p>

        <div v-if="errores.general" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-circle-fill me-2" aria-hidden="true"></i>{{ errores.general }}
        </div>

        <form ref="formRef" @submit.prevent="registrarUsuario" :aria-busy="enviando || undefined">
          <div class="auth-field">
            <label class="form-label" for="username">Nombre de usuario</label>
            <input
              v-model="nombre"
              type="text"
              class="form-control"
              id="username"
              autocomplete="username"
              placeholder="Ingresa tu nombre de usuario"
              required
              :aria-invalid="errores.nombre ? 'true' : undefined"
              :aria-describedby="errores.nombre ? 'nombre-error' : undefined"
            />
            <p v-if="errores.nombre" id="nombre-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.nombre }}
            </p>
          </div>

          <div class="auth-field">
            <label class="form-label" for="email">Correo electrónico</label>
            <input
              v-model="email"
              type="email"
              class="form-control"
              id="email"
              autocomplete="email"
              placeholder="tu@email.com"
              required
              :aria-invalid="errores.email ? 'true' : undefined"
              :aria-describedby="errores.email ? 'email-error' : undefined"
            />
            <p v-if="errores.email" id="email-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.email }}
            </p>
          </div>

          <div class="auth-field">
            <label class="form-label" for="password">Contraseña</label>
            <input
              v-model="password"
              type="password"
              class="form-control"
              id="password"
              autocomplete="new-password"
              placeholder="Ingresa tu contraseña"
              required
              :aria-invalid="errores.password ? 'true' : undefined"
              :aria-describedby="errores.password ? 'password-error' : undefined"
            />
            <p v-if="errores.password" id="password-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.password }}
            </p>
          </div>

          <div class="auth-field">
            <label class="form-label" for="avatar">Avatar <span class="text-muted fw-normal">(opcional)</span></label>
            <input
              type="file"
              class="form-control"
              id="avatar"
              accept="image/*"
              :aria-describedby="errores.avatarFile ? 'avatar-hint avatar-error' : 'avatar-hint'"
              :aria-invalid="errores.avatarFile ? 'true' : undefined"
              @change="onFileChange"
            />
            <small id="avatar-hint" class="text-muted d-block mt-1">JPG, PNG o WEBP. Máx. 2 MB. 200x200 px</small>
            <div v-if="avatarPreview" class="mt-2">
              <img :src="avatarPreview" alt="Vista previa del avatar" class="img-thumbnail avatar-preview" />
            </div>
            <p v-if="errores.avatarFile" id="avatar-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.avatarFile }}
            </p>
          </div>

          <ReCaptcha ref="captchaRef" />
          <div v-if="errores.captcha" class="pl-alert pl-alert--danger" role="alert">
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.captcha }}
          </div>

          <button type="submit" class="pl-btn pl-btn--primary auth-submit" :disabled="enviando">
            <span v-if="enviando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-person-plus-fill" aria-hidden="true"></i>
            {{ enviando ? 'Creando cuenta…' : 'Registrarme' }}
          </button>
        </form>

        <p class="auth-switch">
          ¿Ya tienes cuenta?
          <router-link to="/login">Inicia sesión</router-link>
        </p>
      </div>
    </section>
  </main>

  <Footer :logeado="false" />
</template>

<style scoped>
/* Solo lo distinto de la ficha compartida de style.css: otra imagen de fondo y
   otro halo decorativo. */
.auth-visual {
  background: #172033 url('../assets/img/register-bg.jpg') center / cover no-repeat;
}

.auth-visual::after {
  top: auto;
  right: auto;
  bottom: 12%;
  left: 12%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.58), rgba(108, 92, 231, 0) 68%);
}

.text-muted {
  color: var(--pl-muted) !important;
}

.avatar-preview {
  max-height: 96px;
}
</style>

<script setup lang="ts">
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
import ReCaptcha from '../components/ReCaptcha.vue'
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../services/api'
import { userStore } from '../store/userStore'
import { enfocarPrimerError } from '../composables/useFocoPrimerError'

declare global {
  interface Window {
    google?: any
  }
}

const router = useRouter()
const route = useRoute()
const mensajeRegistro = ref('')
const googleBtnRef = ref<HTMLElement | null>(null)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const nombre = ref('')
const password = ref('')
const errorLogin = ref('')
const captchaRef = ref<InstanceType<typeof ReCaptcha> | null>(null)
const formRef = ref<HTMLFormElement | null>(null)
const enviando = ref(false)

// El error es del formulario entero, así que se retira en cuanto el usuario
// corrige cualquiera de los dos campos.
function onNombreInput() {
  nombre.value = nombre.value.replace(/\s/g, '')
  errorLogin.value = ''
}

function onPasswordInput() {
  password.value = password.value.replace(/\s/g, '')
  errorLogin.value = ''
}

const handleCredentialResponse = async (response: any) => {
  errorLogin.value = ''

  try {
    const res = await api.post('/usuarios/google-login', {
      credential: response.credential,
    })

    localStorage.setItem('token', res.data)
    await userStore.cargarDesdeToken()
    router.push('/dashboard')
  } catch (error: any) {
    errorLogin.value = error.response?.data?.error || 'Error al iniciar sesión con Google'
  }
}

onMounted(() => {
  if (route.query.registro === 'ok') {
    mensajeRegistro.value = 'Usuario creado correctamente. Ya puedes iniciar sesión.'
    router.replace({ query: {} })
  }

  if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      ux_mode: 'popup',
    })
    window.google.accounts.id.renderButton(googleBtnRef.value, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 300,
    })
  }
})

onUnmounted(() => {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.cancel()
  }
})

const iniciarSesion = async () => {
  errorLogin.value = ''
  enviando.value = true

  try {
    const nombreSinEspacios = nombre.value.replace(/\s/g, '')
    const passwordSinEspacios = password.value.replace(/\s/g, '')
    const captchaToken = await captchaRef.value?.getToken()

    const response = await api.post('/usuarios/login', {
      nombre: nombreSinEspacios,
      password: passwordSinEspacios,
      captchaToken,
    })

    localStorage.setItem('token', response.data)
    await userStore.cargarDesdeToken()
    router.push('/dashboard')
  } catch (error: any) {
    captchaRef.value?.reset()

    if (error === 'Por favor, completa el CAPTCHA') {
      errorLogin.value = error
    } else if (error.response?.status === 401) {
      errorLogin.value = 'Usuario o contraseña incorrectos'
    } else if (error.response?.data?.error) {
      errorLogin.value = error.response.data.error
    } else {
      errorLogin.value = 'Error al iniciar sesión'
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
        <span class="pl-kicker pl-kicker--light">Tu historia, tu comunidad</span>
        <h2>Elige tu personaje y empieza a jugar</h2>
        <p>
          Crea una cuenta, explora mundos compartidos y encuentra compañeros para tus próximas historias.
        </p>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <span class="pl-kicker">Bienvenido de nuevo</span>
        <h1 class="auth-heading">Iniciar sesión</h1>
        <p class="auth-subtitle">Accede a tu cuenta para continuar tu aventura.</p>

        <div v-if="mensajeRegistro" class="pl-alert pl-alert--success" role="status">
          <i class="bi bi-check-circle-fill me-2" aria-hidden="true"></i>{{ mensajeRegistro }}
        </div>

        <form ref="formRef" @submit.prevent="iniciarSesion" :aria-busy="enviando || undefined">
          <div class="auth-field">
            <label class="form-label" for="nombre">Nombre de usuario</label>
            <input
              v-model="nombre"
              @input="onNombreInput"
              type="text"
              class="form-control"
              id="nombre"
              autocomplete="username"
              placeholder="Ingresa tu nombre de usuario"
              required
              :aria-invalid="errorLogin ? 'true' : undefined"
              :aria-describedby="errorLogin ? 'login-error' : undefined"
            />
          </div>

          <div class="auth-field">
            <label class="form-label" for="password">Contraseña</label>
            <input
              v-model="password"
              @input="onPasswordInput"
              type="password"
              class="form-control"
              id="password"
              autocomplete="current-password"
              placeholder="Ingresa tu contraseña"
              required
              :aria-invalid="errorLogin ? 'true' : undefined"
              :aria-describedby="errorLogin ? 'login-error' : undefined"
            />
            <p v-if="errorLogin" id="login-error" class="pl-field__error">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errorLogin }}
            </p>
          </div>

          <ReCaptcha ref="captchaRef" />

          <button type="submit" class="pl-btn pl-btn--primary auth-submit" :disabled="enviando">
            <span v-if="enviando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-box-arrow-in-right" aria-hidden="true"></i>
            {{ enviando ? 'Entrando…' : 'Iniciar sesión' }}
          </button>
        </form>

        <div class="auth-divider">o continúa con</div>
        <div ref="googleBtnRef" class="google-btn-wrap"></div>

        <p class="auth-switch">
          ¿No tienes cuenta?
          <router-link to="/registro">Regístrate aquí</router-link>
        </p>
      </div>
    </section>
  </main>

  <Footer :logeado="false" />
</template>

<style scoped>
.google-btn-wrap {
  display: flex;
  justify-content: center;
}
</style>

<script setup lang="ts">
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
import ReCaptcha from '../components/ReCaptcha.vue'
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../services/api'
import { userStore } from '../store/userStore'

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

        <form @submit.prevent="iniciarSesion">
          <div class="auth-field">
            <label class="form-label" for="nombre">Nombre de usuario</label>
            <input
              v-model="nombre"
              @input="nombre = nombre.replace(/\s/g, '')"
              type="text"
              class="form-control"
              id="nombre"
              autocomplete="username"
              placeholder="Ingresa tu nombre de usuario"
              required
            />
          </div>

          <div class="auth-field">
            <label class="form-label" for="password">Contraseña</label>
            <input
              v-model="password"
              @input="password = password.replace(/\s/g, '')"
              type="password"
              class="form-control"
              id="password"
              autocomplete="current-password"
              placeholder="Ingresa tu contraseña"
              required
            />
            <div v-if="errorLogin" class="auth-error" role="alert">
              {{ errorLogin }}
            </div>
          </div>

          <ReCaptcha ref="captchaRef" />

          <button type="submit" class="pl-btn pl-btn--primary auth-submit">
            <i class="bi bi-box-arrow-in-right me-1" aria-hidden="true"></i>Iniciar sesión
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
.auth-visual {
  position: relative;
  display: flex;
  min-height: 650px;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  padding: clamp(2rem, 5vw, 4rem);
  color: #fff;
  background: #172033 url('../assets/img/login-bg.jpg') center / cover no-repeat;
}

.auth-visual::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(23, 32, 51, 0.18), rgba(23, 32, 51, 0.92));
  content: '';
}

.auth-visual::after {
  position: absolute;
  top: 12%;
  right: 12%;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(32, 197, 199, 0.56), rgba(32, 197, 199, 0) 68%);
  content: '';
}

.auth-visual-content {
  position: relative;
  z-index: 1;
  max-width: 560px;
}

.auth-visual-content h2 {
  margin-bottom: 0.9rem;
  font-size: clamp(2rem, 4vw, 3.6rem);
  letter-spacing: -0.045em;
  line-height: 1.05;
}

.auth-visual-content p {
  max-width: 480px;
  margin-bottom: 0;
  color: rgba(255, 255, 255, 0.76);
}

.auth-panel {
  display: flex;
  align-items: center;
  padding: clamp(2rem, 5vw, 4rem);
  background: var(--pl-surface);
}

.auth-card {
  width: 100%;
  max-width: 490px;
  padding: clamp(1.5rem, 4vw, 2.75rem);
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-xl);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-md);
}

.auth-heading {
  margin-bottom: 0.4rem;
  font-size: clamp(1.8rem, 4vw, 2.55rem);
  font-weight: 850;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.auth-subtitle {
  margin-bottom: 1.75rem;
  color: var(--pl-muted);
}

.auth-field {
  margin-bottom: 1rem;
}

.auth-submit {
  width: 100%;
  margin-top: 0.25rem;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.35rem 0;
  color: var(--pl-muted);
  font-size: 0.82rem;
}

.auth-divider::before,
.auth-divider::after {
  flex: 1;
  height: 1px;
  background: var(--pl-border);
  content: '';
}

.auth-error {
  margin-top: 0.55rem;
  color: var(--pl-danger);
  font-size: 0.84rem;
}

.auth-switch {
  margin: 1.25rem 0 0;
  color: var(--pl-muted);
  text-align: center;
}

.google-btn-wrap {
  display: flex;
  justify-content: center;
}

@media (max-width: 991.98px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }

  .auth-visual {
    min-height: 310px;
  }

  .auth-panel {
    min-height: auto;
    padding: 2rem 1rem;
  }
}

@media (max-width: 575.98px) {
  .auth-visual {
    min-height: 280px;
    padding: 1.5rem;
  }

  .auth-panel {
    padding: 1.5rem 1rem;
  }

  .auth-card {
    padding: 1.4rem 1rem;
  }
}
</style>

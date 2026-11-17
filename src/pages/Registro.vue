<script setup lang="ts">
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
import ReCaptcha from '../components/ReCaptcha.vue'
import { ref } from 'vue'
import api from '../services/api'
import { useRouter } from 'vue-router'

const router = useRouter()
const nombre = ref('')
const email = ref('')
const password = ref('')
const errores = ref<Record<string, string>>({})
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const captchaRef = ref<InstanceType<typeof ReCaptcha> | null>(null)

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement

  if (target.files && target.files[0]) {
    avatarFile.value = target.files[0]
    avatarPreview.value = URL.createObjectURL(target.files[0])
  }
}

const registrarUsuario = async () => {
  errores.value = {}

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

        <form @submit.prevent="registrarUsuario">
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
            />
            <div v-if="errores.nombre" class="auth-error" role="alert">
              {{ errores.nombre }}
            </div>
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
            />
            <div v-if="errores.email" class="auth-error" role="alert">
              {{ errores.email }}
            </div>
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
            />
            <div v-if="errores.password" class="auth-error" role="alert">
              {{ errores.password }}
            </div>
          </div>

          <div class="auth-field">
            <label class="form-label" for="avatar">Avatar <span class="text-muted fw-normal">(opcional)</span></label>
            <input
              type="file"
              class="form-control"
              id="avatar"
              accept="image/*"
              @change="onFileChange"
            />
            <small class="text-muted d-block mt-1">JPG, PNG o WEBP. Máx. 2 MB. 200x200 px</small>
            <div v-if="avatarPreview" class="mt-2">
              <img :src="avatarPreview" alt="Vista previa del avatar" class="img-thumbnail" style="max-height: 96px;" />
            </div>
            <div v-if="errores.avatarFile" class="auth-error" role="alert">
              {{ errores.avatarFile }}
            </div>
          </div>

          <ReCaptcha ref="captchaRef" />
          <div v-if="errores.captcha" class="auth-error" role="alert">
            {{ errores.captcha }}
          </div>

          <button type="submit" class="pl-btn pl-btn--primary auth-submit">
            <i class="bi bi-person-plus-fill me-1" aria-hidden="true"></i>Registrarme
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
.auth-visual {
  position: relative;
  display: flex;
  min-height: 650px;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  padding: clamp(2rem, 5vw, 4rem);
  color: #fff;
  background: #172033 url('../assets/img/register-bg.jpg') center / cover no-repeat;
}

.auth-visual::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(23, 32, 51, 0.18), rgba(23, 32, 51, 0.92));
  content: '';
}

.auth-visual::after {
  position: absolute;
  bottom: 12%;
  left: 12%;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.58), rgba(108, 92, 231, 0) 68%);
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
  justify-content: center;
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

.text-muted {
  color: var(--pl-muted) !important;
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

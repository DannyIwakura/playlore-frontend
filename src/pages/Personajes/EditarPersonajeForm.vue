<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import GaleriaImagenes from '../../components/GaleriaImagenes.vue'
import api from '../../services/api'
import { enfocarPrimerError } from '../../composables/useFocoPrimerError'

const BASE_URL = import.meta.env.VITE_API_URL
const route = useRoute()
const router = useRouter()
const personajeId = route.params.id
const errores = reactive<Record<string, string>>({})
const formRef = ref<HTMLFormElement | null>(null)
const enviando = ref(false)

const personaje = reactive({
  nombre: "",
  genero_personaje: "",
  edad_personaje: null as number | null,
  avatar: null as File | null,
  avatarActual: "",
  trasfondo: "",
  raza: "",
  clase: ""
})

onMounted(async () => {
  try {
    // Recuperamos los datos del personaje para rellenar inputs
    const res = await api.get(`/personajes/${personajeId}`)
    const data = res.data
    personaje.nombre = data.nombre
    personaje.genero_personaje = data.genero
    personaje.edad_personaje = data.edadPersonaje
    personaje.trasfondo = data.trasfondo
    personaje.raza = data.raza
    personaje.clase = data.clase
    personaje.avatarActual = data.avatar
  } catch (e) {
    // error shown in form or already handled upstream
  }
})

function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement

  const file = input.files?.[0]
  if (!file) return

  personaje.avatar = file
}

async function actualizarPersonaje() {
  // Limpiar mensajes de errores de validación
  Object.keys(errores).forEach(key => delete errores[key])
  enviando.value = true

  try {
    const formData = new FormData()
    // Recogemos los datos de los inputs
    formData.append(
      "personaje",
      new Blob([JSON.stringify({
        nombre: personaje.nombre,
        genero: personaje.genero_personaje,
        edadPersonaje: personaje.edad_personaje,
        trasfondo: personaje.trasfondo,
        raza: personaje.raza,
        clase: personaje.clase
      })], { type: "application/json" })
    )

    if (personaje.avatar) {
      formData.append("avatarFile", personaje.avatar)
    }
    // Hacemos POST al backend
    await api.put(`/personajes/${personajeId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })

    router.push('/personajes')

  } catch (error: any) {
    if (error.response?.status === 400) {
      Object.assign(errores, error.response.data)
      await enfocarPrimerError(formRef.value)
    } else {
      // error shown in form or already handled upstream
    }
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Personajes</span>
        <h1 class="pl-title">Editar Personaje</h1>
        <p class="pl-lead">Actualiza los datos de tu personaje y gestiona su galería.</p>
      </header>

      <form ref="formRef" @submit.prevent="actualizarPersonaje" :aria-busy="enviando || undefined">
        <div class="card form-card">
          <div class="card-body">
            <div class="pl-field">
              <label class="form-label" for="nombre">Nombre del personaje</label>
              <input
                id="nombre"
                v-model="personaje.nombre"
                type="text"
                class="form-control"
                required
                :aria-invalid="errores.nombre ? 'true' : undefined"
                :aria-describedby="errores.nombre ? 'nombre-error' : undefined"
              />
              <p v-if="errores.nombre" id="nombre-error" class="pl-field__error">
                <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.nombre }}
              </p>
            </div>

            <div class="row g-3">
              <div class="col-md-4">
                <div class="pl-field">
                  <label class="form-label" for="genero">Género</label>
                  <select
                    id="genero"
                    v-model="personaje.genero_personaje"
                    class="form-select"
                    :aria-invalid="errores.genero ? 'true' : undefined"
                    :aria-describedby="errores.genero ? 'genero-error' : undefined"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                  <p v-if="errores.genero" id="genero-error" class="pl-field__error">
                    <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.genero }}
                  </p>
                </div>
              </div>

              <div class="col-md-4">
                <div class="pl-field">
                  <label class="form-label" for="edad">Edad</label>
                  <input
                    id="edad"
                    v-model="personaje.edad_personaje"
                    type="number"
                    class="form-control"
                    :aria-invalid="errores.edadPersonaje ? 'true' : undefined"
                    :aria-describedby="errores.edadPersonaje ? 'edad-error' : undefined"
                  />
                  <p v-if="errores.edadPersonaje" id="edad-error" class="pl-field__error">
                    <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.edadPersonaje }}
                  </p>
                </div>
              </div>

              <div class="col-md-4">
                <div class="pl-field">
                  <label class="form-label d-block" for="avatar">Avatar actual</label>
                  <img v-if="personaje.avatarActual" :src="BASE_URL + personaje.avatarActual" class="avatar-preview mb-2" alt="Avatar actual del personaje" />
                  <input
                    id="avatar"
                    type="file"
                    class="form-control"
                    accept="image/*"
                    :aria-describedby="errores.avatarFile ? 'avatar-hint avatar-error' : 'avatar-hint'"
                    :aria-invalid="errores.avatarFile ? 'true' : undefined"
                    @change="handleAvatarUpload"
                  />
                  <p id="avatar-hint" class="pl-field__hint">JPG, PNG o WEBP. Máx. 400x400 px.</p>
                  <p v-if="errores.avatarFile" id="avatar-error" class="pl-field__error">
                    <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.avatarFile }}
                  </p>
                </div>
              </div>

              <div class="col-md-6">
                <div class="pl-field">
                  <label class="form-label" for="raza">Raza</label>
                  <input
                    id="raza"
                    v-model="personaje.raza"
                    type="text"
                    class="form-control"
                    :aria-invalid="errores.raza ? 'true' : undefined"
                    :aria-describedby="errores.raza ? 'raza-error' : undefined"
                  />
                  <p v-if="errores.raza" id="raza-error" class="pl-field__error">
                    <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.raza }}
                  </p>
                </div>
              </div>

              <div class="col-md-6">
                <div class="pl-field">
                  <label class="form-label" for="clase">Clase</label>
                  <input
                    id="clase"
                    v-model="personaje.clase"
                    type="text"
                    class="form-control"
                    :aria-invalid="errores.clase ? 'true' : undefined"
                    :aria-describedby="errores.clase ? 'clase-error' : undefined"
                  />
                  <p v-if="errores.clase" id="clase-error" class="pl-field__error">
                    <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.clase }}
                  </p>
                </div>
              </div>
            </div>

            <div class="pl-field">
              <label class="form-label d-block" for="trasfondo">Trasfondo</label>
              <RichTextEditor v-model="personaje.trasfondo" />
              <p v-if="errores.trasfondo" class="pl-field__error">
                <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.trasfondo }}
              </p>
            </div>

            <div class="d-flex gap-2">
              <button type="submit" class="pl-btn pl-btn--primary" :disabled="enviando">
                <span v-if="enviando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <i v-else class="bi bi-check-lg" aria-hidden="true"></i>
                {{ enviando ? 'Guardando…' : 'Guardar cambios' }}
              </button>
              <router-link to="/personajes" class="pl-btn pl-btn--secondary">Cancelar</router-link>
            </div>
          </div>
        </div>
      </form>

      <section class="mt-5">
        <h2 class="pl-section-title">Galería de imágenes</h2>
        <GaleriaImagenes
          :personaje-id="Number(personajeId)"
          :es-propietario="true"
        />
      </section>
    </div>
  </main>
  <Footer />
</template>

<style scoped>
.form-card {
  max-width: 860px;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: var(--pl-radius-lg);
}

.pl-section-title {
  margin-bottom: 1rem;
  color: var(--pl-ink);
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
</style>
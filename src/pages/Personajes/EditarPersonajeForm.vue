<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import GaleriaImagenes from '../../components/GaleriaImagenes.vue'
import api from '../../services/api'

const BASE_URL = import.meta.env.VITE_API_URL
const route = useRoute()
const router = useRouter()
const personajeId = route.params.id
const errores = reactive<Record<string, string>>({})

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
    } else {
      // error shown in form or already handled upstream
    }
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

      <form @submit.prevent="actualizarPersonaje">
        <div class="card form-card">
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label" for="nombre">Nombre del personaje</label>
              <input id="nombre" v-model="personaje.nombre" type="text" class="form-control" required />
              <div v-if="errores.nombre" class="field-error">
                {{ errores.nombre }}
              </div>
            </div>

            <div class="row g-3">
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label" for="genero">Género</label>
                  <select id="genero" v-model="personaje.genero_personaje" class="form-select">
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                  <div v-if="errores.genero" class="field-error">
                    {{ errores.genero }}
                  </div>
                </div>
              </div>

              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label" for="edad">Edad</label>
                  <input id="edad" v-model="personaje.edad_personaje" type="number" class="form-control" />
                  <div v-if="errores.edadPersonaje" class="field-error">
                    {{ errores.edadPersonaje }}
                  </div>
                </div>
              </div>

              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label d-block">Avatar actual</label>
                  <img v-if="personaje.avatarActual" :src="BASE_URL + personaje.avatarActual" class="avatar-preview mb-2" alt="Avatar actual del personaje" />
                  <input type="file" class="form-control" @change="handleAvatarUpload" />
                </div>
              </div>

              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label" for="raza">Raza</label>
                  <input id="raza" v-model="personaje.raza" type="text" class="form-control" />
                  <div v-if="errores.raza" class="field-error">
                    {{ errores.raza }}
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label" for="clase">Clase</label>
                  <input id="clase" v-model="personaje.clase" type="text" class="form-control" />
                  <div v-if="errores.clase" class="field-error">
                    {{ errores.clase }}
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label d-block" for="trasfondo">Trasfondo</label>
              <RichTextEditor v-model="personaje.trasfondo" />
            </div>

            <div class="d-flex gap-2">
              <button type="submit" class="pl-btn pl-btn--primary">
                <i class="bi bi-check-lg" aria-hidden="true"></i> Guardar cambios
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

.field-error {
  margin-top: 0.4rem;
  color: var(--pl-danger);
  font-size: 0.84rem;
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
<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import ModalAviso from '../../components/ModalAviso.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'
import { enfocarPrimerError } from '../../composables/useFocoPrimerError'

const router = useRouter()
const errores = reactive<Record<string, string>>({})
const aviso = ref<string | null>(null)
const formRef = ref<HTMLFormElement | null>(null)
const enviando = ref(false)

const personaje = reactive({
  nombre: "",
  genero_personaje: "",
  edad_personaje: null as number | null,
  avatar: null as File | null,
  trasfondo: "",
  raza: "",
  clase: ""
})

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  personaje.avatar = file
}

async function crearPersonaje() {
  // Limpiar errores
  Object.keys(errores).forEach(key => delete errores[key])
  if (!userStore.usuario?.value) {
    aviso.value = "No se ha detectado usuario logueado"
    return
  }
  enviando.value = true
  try {
    const formData = new FormData()
    // Recoger datos de campos
    formData.append(
      "personaje",
      new Blob([JSON.stringify({
        nombre: personaje.nombre,
        genero: personaje.genero_personaje,
        edadPersonaje: personaje.edad_personaje,
        trasfondo: personaje.trasfondo,
        raza: personaje.raza,
        clase: personaje.clase,
        userId: userStore.usuario.value.id
      })], { type: "application/json" })
    )
    if (personaje.avatar) {
      formData.append("avatarFile", personaje.avatar)
    }
    // Hacemos POST hacia el back
    await api.post('/personajes', formData)
    router.push({ path: '/personajes', query: { creacion: 'ok' } })
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
        <h1 class="pl-title">Crear Nuevo Personaje</h1>
        <p class="pl-lead">Cuéntanos quién es tu personaje: su historia, su mundo y su estilo.</p>
      </header>

      <form ref="formRef" @submit.prevent="crearPersonaje" :aria-busy="enviando || undefined">
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
                    required
                    :aria-invalid="errores.genero ? 'true' : undefined"
                    :aria-describedby="errores.genero ? 'genero-error' : undefined"
                  >
                    <option disabled value="">Selecciona una opción</option>
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
                    required
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
                  <label class="form-label" for="avatar">Avatar</label>
                  <input
                    id="avatar"
                    type="file"
                    class="form-control"
                    accept="image/*"
                    :aria-describedby="errores.avatarFile ? 'avatar-hint avatar-error' : 'avatar-hint'"
                    :aria-invalid="errores.avatarFile ? 'true' : undefined"
                    @change="onFileChange"
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
                    required
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
                    required
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
              <RichTextEditor v-model="personaje.trasfondo" required/>
              <p v-if="errores.trasfondo" class="pl-field__error">
                <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.trasfondo }}
              </p>
            </div>

            <div class="d-flex gap-2">
              <button type="submit" class="pl-btn pl-btn--success" :disabled="enviando">
                <span v-if="enviando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <i v-else class="bi bi-plus-lg" aria-hidden="true"></i>
                {{ enviando ? 'Creando…' : 'Crear Personaje' }}
              </button>
              <router-link to="/personajes" class="pl-btn pl-btn--secondary">Cancelar</router-link>
            </div>
          </div>
        </div>
      </form>
    </div>
  </main>
  <Footer />

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.form-card {
  max-width: 860px;
}
</style>
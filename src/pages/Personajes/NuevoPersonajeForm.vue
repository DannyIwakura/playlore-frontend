<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import ModalAviso from '../../components/ModalAviso.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'

const router = useRouter()
const errores = reactive<Record<string, string>>({})
const aviso = ref<string | null>(null)

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
        <h1 class="pl-title">Crear Nuevo Personaje</h1>
        <p class="pl-lead">Cuéntanos quién es tu personaje: su historia, su mundo y su estilo.</p>
      </header>

      <form @submit.prevent="crearPersonaje">
        <div class="card form-card">
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label" for="nombre">Nombre del personaje</label>
              <input id="nombre" v-model="personaje.nombre" type="text" class="form-control" required />
              <div v-if="errores.nombre" class="field-error">{{ errores.nombre }}</div>
            </div>

            <div class="row g-3">
              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label" for="genero">Género</label>
                  <select id="genero" v-model="personaje.genero_personaje" class="form-select" required>
                    <option disabled value="">Selecciona una opción</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                  <div v-if="errores.genero" class="field-error">{{ errores.genero }}</div>
                </div>
              </div>

              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label" for="edad">Edad</label>
                  <input id="edad" v-model="personaje.edad_personaje" type="number" class="form-control" required/>
                  <div v-if="errores.edadPersonaje" class="field-error">
                    {{ errores.edadPersonaje }}</div>
                </div>
              </div>

              <div class="col-md-4">
                <div class="mb-3">
                  <label class="form-label" for="avatar">Avatar</label>
                  <input id="avatar" type="file" class="form-control" accept="image/*" @change="onFileChange" />
                </div>
              </div>

              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label" for="raza">Raza</label>
                  <input id="raza" v-model="personaje.raza" type="text" class="form-control" required/>
                  <div v-if="errores.raza" class="field-error">
                    {{ errores.raza }}</div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label" for="clase">Clase</label>
                  <input id="clase" v-model="personaje.clase" type="text" class="form-control" required/>
                  <div v-if="errores.clase" class="field-error">
                    {{ errores.clase }}
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label d-block" for="trasfondo">Trasfondo</label>
              <RichTextEditor v-model="personaje.trasfondo" required/>
              <div v-if="errores.trasfondo" class="field-error">
                {{ errores.trasfondo }}
              </div>
            </div>

            <div class="d-flex gap-2">
              <button type="submit" class="pl-btn pl-btn--success">
                <i class="bi bi-plus-lg" aria-hidden="true"></i> Crear Personaje
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

.field-error {
  margin-top: 0.4rem;
  color: var(--pl-danger);
  font-size: 0.84rem;
}
</style>
<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import api from '../../services/api'

const BASE_URL = 'http://localhost:8080/api'
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
    console.error(e)
  }
})

function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    personaje.avatar = input.files[0]
  }
}

async function actualizarPersonaje() {
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
  // Hacemos PUT al back para actualizar
  await api.put(`/personajes/${personajeId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  })
  router.push('/personajes')
}
</script>

<template>
  <NavBar :logeado="true" />
  <div class="container mt-4">
    <h1 class="mb-4">Editar Personaje</h1>
    <form @submit.prevent="actualizarPersonaje">
      <div class="mb-3">
        <label class="form-label">Nombre del personaje</label>
        <input v-model="personaje.nombre" type="text" class="form-control" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Género</label>
        <select v-model="personaje.genero_personaje" class="form-control">
          <option value="Masculino">Masculino</option>
          <option value="Femenino">Femenino</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Edad</label>
        <input v-model="personaje.edad_personaje" type="number" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Avatar actual</label>
        <img v-if="personaje.avatarActual" :src="BASE_URL + personaje.avatarActual" class="avatar-preview mb-2" />
        <input type="file" class="form-control" @change="handleAvatarUpload" />
      </div>
      <div class="mb-3">
        <label class="form-label">Raza</label>
        <input v-model="personaje.raza" type="text" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Clase</label>
        <input v-model="personaje.clase" type="text" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label d-block">Trasfondo</label>
        <RichTextEditor v-model="personaje.trasfondo" />
      </div>
      <div class="d-flex gap-2 mb-4">
        <button type="submit" class="btn btn-primary">Guardar cambios</button>
        <router-link to="/personajes" class="btn btn-secondary">Cancelar</router-link>
      </div>
    </form>
  </div>
  <Footer />
</template>

<style scoped>
.avatar-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 10px;
}
</style>
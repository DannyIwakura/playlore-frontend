<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'

const router = useRouter()
const errores = reactive<Record<string, string>>({})

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
  if (target.files && target.files.length > 0) {
    personaje.avatar = target.files[0]
  }
}

async function crearPersonaje() {
  if (!userStore.usuario?.value) {
    alert("No se ha detectado usuario logueado")
    return
  }
  try {
    const formData = new FormData()
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
    await api.post('/personajes', formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
    router.push({ path: '/personajes', query: { creacion: 'ok' } })
  } catch (error: any) {
    if (error.response?.status === 400) {
      Object.assign(errores, error.response.data)
    } else {
      console.error("Error al crear personaje:", error)
    }
  }
}
</script>

<template>
  <NavBar :logeado="true" />
  <div class="container mt-4">
    <h1 class="mb-4">Crear Nuevo Personaje</h1>
    <form @submit.prevent="crearPersonaje">
      <div class="mb-3">
        <label class="form-label">Nombre del personaje</label>
        <input v-model="personaje.nombre" type="text" class="form-control" required />
        <div v-if="errores.nombre" class="text-danger">
          {{ errores.nombre }}
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Género</label>
        <select v-model="personaje.genero_personaje" class="form-control" required>
          <option disabled value="">Selecciona una opción</option>
          <option value="Masculino">Masculino</option>
          <option value="Femenino">Femenino</option>
        </select>
        <div v-if="errores.genero" class="text-danger">
          {{ errores.genero }}
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Edad</label>
        <input v-model="personaje.edad_personaje" type="number" class="form-control" required/>
        <div v-if="errores.edadPersonaje" class="text-danger">
          {{ errores.edadPersonaje }}
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Avatar</label>
        <input type="file" class="form-control" accept="image/*" @change="onFileChange" />
      </div>
      <div class="mb-3">
        <label class="form-label">Raza</label>
        <input v-model="personaje.raza" type="text" class="form-control" required/>
      </div>
      <div class="mb-3">
        <label class="form-label">Clase</label>
        <input v-model="personaje.clase" type="text" class="form-control" required/>
      </div>
      <div class="mb-3">
        <label class="form-label d-block">Trasfondo</label>
        <RichTextEditor v-model="personaje.trasfondo" required/>
      </div>
      <div class="d-flex gap-2 mb-4">
        <button type="submit" class="btn btn-success">Crear Personaje</button>
        <router-link to="/personajes" class="btn btn-secondary">Cancelar</router-link>
      </div>
    </form>
  </div>
  <Footer />
</template>
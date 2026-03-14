<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'

const route = useRoute()
const router = useRouter()

const personaje = reactive({
  nombre: "",
  edad_personaje: null as number | null,
  avatar: null as File | null,
  estado: 1,
  trasfondo: "",
  raza: "",
  clase: ""
})

const personajeId = route.params.id

function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement

  if (input.files && input.files.length > 0) {
    personaje.avatar = input.files[0]
  }
}

function actualizarPersonaje() {
  console.log("Personaje actualizado:", personaje)

  // axios.put(`/api/personajes/${personajeId}`, personaje)

  router.push('/personajes')
}

//simulo que me traigo personaje desde la api
onMounted(() => {
  const personajeAPI = {
    nombre: "Aelion",
    edad_personaje: 32,
    trasfondo: "Caballero caído que busca redención.",
    raza: "Humano",
    clase: "Caballero",
  }

  personaje.nombre = personajeAPI.nombre
  personaje.edad_personaje = personajeAPI.edad_personaje
  personaje.trasfondo = personajeAPI.trasfondo
  personaje.raza = personajeAPI.raza
  personaje.clase = personajeAPI.clase
})
</script>

<template>
  <NavBar :logeado="true" />

  <div class="container mt-4">
    <h1 class="mb-4">Editar Personaje</h1>

    <form @submit.prevent="actualizarPersonaje">

      <!-- Nombre -->
      <div class="mb-3">
        <label class="form-label">Nombre del personaje</label>
        <input
          type="text"
          class="form-control"
          v-model="personaje.nombre"
          required
        />
      </div>

      <!-- Edad -->
      <div class="mb-3">
        <label class="form-label">Edad</label>
        <input
          type="number"
          class="form-control"
          v-model="personaje.edad_personaje"
        />
      </div>

      <!-- Avatar -->
      <div class="mb-3">
        <label class="form-label">Cambiar Avatar</label>
        <input
          type="file"
          class="form-control"
          accept="image/*"
          @change="handleAvatarUpload"
        />
      </div>

      <!-- Raza -->
      <div class="mb-3">
        <label class="form-label">Raza</label>
        <input
          type="text"
          class="form-control"
          v-model="personaje.raza"
        />
      </div>

      <!-- Clase -->
      <div class="mb-3">
        <label class="form-label">Clase</label>
        <input
          type="text"
          class="form-control"
          v-model="personaje.clase"
        />
      </div>

      <!-- Trasfondo -->
      <div class="mb-3">
        <label class="form-label">Trasfondo</label>
        <textarea
          class="form-control"
          rows="4"
          maxlength="250"
          v-model="personaje.trasfondo"
        ></textarea>
      </div>

      <!-- Botones -->
      <div class="d-flex gap-2 mb-4">
        <button type="submit" class="btn btn-primary">
          Guardar Cambios
        </button>

        <router-link to="/personajes" class="btn btn-secondary">
          Cancelar
        </router-link>
      </div>

    </form>
  </div>

  <Footer />
</template>
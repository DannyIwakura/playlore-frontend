<script setup lang="ts">
import { reactive } from 'vue'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'

const personaje = reactive({
  nombre: "",
  edad_personaje: null as number | null,
  avatar: null as File | null,
  estado: 1,
  trasfondo: "",
  raza: "",
  clase: ""
})

function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement

  if (input.files && input.files.length > 0) {
    personaje.avatar = input.files[0]
  }
}

function crearPersonaje() {
  console.log("Personaje a enviar:", personaje)

  // Aquí luego harás el POST
  // axios.post("/api/personajes", personaje)
}
</script>

<template>
  <NavBar :logeado="true" />

  <div class="container mt-4">
    <h1 class="mb-4">Crear Nuevo Personaje</h1>

    <form @submit.prevent="crearPersonaje">
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
    <label class="form-label">Avatar</label>
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
        <input type="text" class="form-control" v-model="personaje.raza" />
      </div>

      <!-- Clase -->
      <div class="mb-3">
        <label class="form-label">Clase</label>
        <input type="text" class="form-control" v-model="personaje.clase" />
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
        <button type="submit" class="btn btn-success">Crear Personaje</button>

        <router-link to="/personajes" class="btn btn-secondary">
          Cancelar
        </router-link>
      </div>
    </form>
  </div>

  <Footer />
</template>

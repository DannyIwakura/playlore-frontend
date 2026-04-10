<script setup lang="ts">
import { reactive } from 'vue'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import api from '../../services/api';
import { userStore } from '../../store/userStore';
import { useRouter } from 'vue-router'

const router = useRouter()

const personaje = reactive({
  nombre: "",
  genero_personaje: "",
  edad_personaje: null as number | null,
  avatar: null as File | null,
  estado: 1,
  trasfondo: "",
  raza: "",
  clase: ""
})

async function crearPersonaje() {
  if (!userStore.usuario) {
    alert("No se ha detectado usuario logueado");
    return;
  }
  //creamos el bosyrequest que enviamos al back
  const payload = {
    nombre: personaje.nombre,
    generoPersonaje: personaje.genero_personaje,
    edadPersonaje: personaje.edad_personaje,
    avatar: personaje.avatar,
    estado: "ACTIVO",
    trasfondo: personaje.trasfondo,
    raza: personaje.raza,
    clase: personaje.clase,
    userId: userStore.usuario.id
  };

  try {
    //enviamos la solicitud con el palyload anterior y recogesmos la respuesta
    const response = await api.post('/personajes', payload);
    //debug
    console.log("Personaje creado:", response.data);
  } catch (error: any) {
    console.error("Error al crear personaje:", error.response || error);
  }

  //si se registra el personaje correctamente redirigimos al usuario a la lista de personajes
  router.push({
    path: '/personajes', 
    query: { 
      creacion: 'ok'
    }
  })
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

      <!-- Genero -->
      <div class="mb-3">
        <label class="form-label">Género</label>
        <select
          class="form-control"
          v-model="personaje.genero_personaje"
          required
        >
          <option disabled value="">Selecciona una opción</option>
          <option value="Masculino">Masculino</option>
          <option value="Femenino">Femenino</option>
        </select>
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
        @change=""
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

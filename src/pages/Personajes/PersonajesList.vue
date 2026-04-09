<script setup lang="ts">
import Footer from '../../components/Footer.vue';
import NavBar from '../../components/NavBar.vue';
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const router = useRouter()
const route = useRoute()
const mensajePErsonajeCreado = ref<string | null>(null)

onMounted(() => {
  // Si venimos de crear un personaje mostramos el mensaje de éxito
  if (route.query.creacion === 'ok') {
    mensajePErsonajeCreado.value = "Personaje creado correctamente."
    // Limpiamos la query para que el mensaje no aparezca al recargar la página
    router.replace({ query: {} })
  }
})


const personajes = [
  {
    id: 1,
    nombre: "Aelion",
    descripcion: "Un caballero errante que busca redención tras la caída de su reino.",
    edad: 32,
    genero: "Masculino",
    raza: "Humano",
    clase: "Caballero",
    retrato: "https://picsum.photos/300/300?random=1"
  },
  {
    id: 2,
    nombre: "Lyra",
    descripcion: "Hechicera élfica experta en magia lunar y conocimiento antiguo.",
    edad: 120,
    genero: "Femenino",
    raza: "Elfa",
    clase: "Hechicera",
    retrato: "https://picsum.photos/300/300?random=2"
  },
  {
    id: 3,
    nombre: "Drog",
    descripcion: "Guerrero orco que lucha para demostrar que su honor vale más que su fuerza.",
    edad: 40,
    genero: "Masculino",
    raza: "Orco",
    clase: "Guerrero",
    retrato: "https://picsum.photos/300/300?random=3"
  }
];
</script>

<template>
  <NavBar :logeado="true" />

  <div class="container mt-4">
    <div class="row">
        
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="mb-0">Lista de tus Personajes</h1>

      <router-link 
        to="/personajes/crear"
        class="btn btn-success"
      >
        Crear Nuevo
      </router-link>
    </div>
      <div v-if="mensajePErsonajeCreado" class="alert alert-success">
        {{ mensajePErsonajeCreado }}
      </div>
      <div
        class="col-md-4 mb-4"
        v-for="personaje in personajes"
        :key="personaje.id"
      >
        <div class="card h-100 shadow">
          
          <img
            :src="personaje.retrato"
            class="card-img-top"
            alt="Retrato del personaje"
          />

          <div class="card-body">
            <h5 class="card-title">{{ personaje.nombre }}</h5>
            <p class="card-text">{{ personaje.descripcion }}</p>

            <ul class="list-group list-group-flush mb-3">
              <li class="list-group-item"><strong>Edad:</strong> {{ personaje.edad }}</li>
              <li class="list-group-item"><strong>Género:</strong> {{ personaje.genero }}</li>
              <li class="list-group-item"><strong>Raza:</strong> {{ personaje.raza }}</li>
              <li class="list-group-item"><strong>Clase:</strong> {{ personaje.clase }}</li>
            </ul>

            <router-link 
              :to="`/personaje/${personaje.id}`" 
              class="btn btn-primary w-100"
            >
              Ver Perfil Completo
            </router-link>

            <router-link 
              :to="`/personajes/editar/${personaje.id}`" 
              class="btn btn-secondary w-100 mb-2 mt-2"
            >
              Editar Perfil
            </router-link>

          </div>

        </div>
      </div>

    </div>
  </div>

  <Footer />
</template>
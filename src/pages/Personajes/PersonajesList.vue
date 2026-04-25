<script setup lang="ts">
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../services/api'
import { userStore } from '../../store/userStore'
import AnadirCategoriaForm from './AnadirCategoriaForm.vue'

const BASE_URL = 'http://localhost:8080/api'
const AVATAR_DEFECTO = 'http://localhost:8080/api/images/AVATAR.png'


const router = useRouter()
const route = useRoute()

const mensajePersonajeCreado = ref<string | null>(null)
const personajes = ref<any[]>([])

onMounted(async () => {
  if (route.query.creacion === 'ok') {
    mensajePersonajeCreado.value = "Personaje creado correctamente."
    router.replace({ query: {} })
  }

  try {
    const userId = userStore.usuario.value?.id
    const response = await api.get(`/personajes/usuario/${userId}`)
    personajes.value = response.data
  } catch (error) {
    console.error("Error cargando personajes:", error)
  }
})
//función para eliminar un personaje
const eliminarPersonaje = async (idPersonaje: number) => {
  const confirmacion = confirm("¿Seguro que quieres eliminar este personaje?")

  if (!confirmacion) return

  try {
    await api.delete(`/personajes/${idPersonaje}`)

    personajes.value = personajes.value.filter(
      (p) => p.idPersonaje !== idPersonaje
    )

  } catch (error) {
    console.error("Error eliminando personaje:", error)
  }
}

const mostrarModal = ref(false);
const personajeSeleccionadoId = ref<number | null>(null);

const abrirModalCategorias = (id: number) => {
  personajeSeleccionadoId.value = id;
  mostrarModal.value = true;
}

const recargarDatos = async () => {
  // Función para refrescar la lista si el modal hizo cambios
  const userId = userStore.usuario.value?.id
  const response = await api.get(`/personajes/usuario/${userId}`)
  personajes.value = response.data
}

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) {
    return avatar
  }

  return BASE_URL + avatar
}

</script>

<template>
  <NavBar :logeado="true" />

  <div class="container mt-4">

    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="mb-0">Lista de tus Personajes</h1>

      <router-link to="/personajes/crear" class="btn btn-success">
        Crear Nuevo
      </router-link>
    </div>

    <div v-if="mensajePersonajeCreado" class="alert alert-success">
      {{ mensajePersonajeCreado }}
    </div>
    <div v-if="personajes.length === 0" class="alert alert-info text-center">
      No tienes personajes creados todavía.
      <br />
      ¡Empieza creando uno!
    </div>

    <div v-else class="row">
      <div
        class="col-md-4 mb-4"
        v-for="personaje in personajes"
        :key="personaje.idPersonaje"
      >
        <div class="card h-100 shadow">

          <!-- AVATAR -->
          <img
            :src="avatarUrl(personaje.avatar)"
            class="card-img-top"
            alt="Avatar personaje"
          />
          <div class="card-body">

            <!-- NOMBRE -->
            <h5 class="card-title">
              {{ personaje.nombre }}
            </h5>

            <!-- INFO BASE -->
            <p class="mb-1"><strong>Género:</strong> {{ personaje.genero }}</p>
            <p class="mb-1"><strong>Raza:</strong> {{ personaje.raza }}</p>
            <p class="mb-2"><strong>Clase:</strong> {{ personaje.clase }}</p>

            <!-- TRASFONDO (HTML SAFE PREVIEW) -->
            <div class="trasfondo-preview mb-3" v-html="personaje.trasfondo"></div>

            <!-- BOTONES -->
            <router-link
              :to="`/personaje/${personaje.idPersonaje}`"
              class="btn btn-primary w-100 mb-2"
            >
              Ver Perfil Completo
            </router-link>

            <router-link
              :to="`/personajes/editar/${personaje.idPersonaje}`"
              class="btn btn-secondary w-100 mb-2"
            >
              Editar Perfil
            </router-link>
            <button 
            @click="abrirModalCategorias(personaje.idPersonaje)"
            class="btn btn-outline-secondary w-100 mb-2"
            >
            Gestionar Categorías
            </button>

            <AnadirCategoriaForm 
            v-if="mostrarModal" 
            :idPersonaje="personajeSeleccionadoId!" 
            @close="mostrarModal = false"
            @success="recargarDatos"
            />

            <button
              class="btn btn-danger w-100"
              @click="eliminarPersonaje(personaje.idPersonaje)"
            >
              Eliminar
            </button>

          </div>
        </div>
      </div>
    </div>

  </div>

  <Footer />
</template>
<style scoped> 
.trasfondo-preview {
  max-height: 120px;
  overflow: hidden;
  position: relative;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* fade bonito estilo Notion */
.trasfondo-preview::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, transparent, white);
}
</style>
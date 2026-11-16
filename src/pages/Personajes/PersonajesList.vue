<script setup lang="ts">
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import { onMounted, ref } from 'vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'
import AnadirCategoriaForm from './AnadirCategoriaForm.vue'
import PaginadorComponent from '../../components/PaginadorComponent.vue'
import ModalConfirmacion from '../../components/ModalConfirmacion.vue'
import ModalAviso from '../../components/ModalAviso.vue'

const BASE_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${BASE_URL}/images/AVATAR.png`

const mensajePersonajeCreado = ref<string | null>(null)
const personajes = ref<any[]>([])
const paginaActual = ref(0)
const totalPaginas = ref(0)
const TAMANIO_PAGINA = 6

const cargarPersonajes = async (pagina = 0) => {
  try {
    const userId = userStore.usuario.value?.id
    const response = await api.get(`/personajes/usuario/${userId}`, {
      params: { page: pagina, size: TAMANIO_PAGINA }
    })
    // Si quieres paginar también los de un usuario, usa el endpoint paginado general
    // o adapta el endpoint /usuario/{id} del mismo modo
    personajes.value = response.data.content
    totalPaginas.value = response.data.totalPages
    paginaActual.value = pagina
  } catch (error) {
  }
}

onMounted(() => cargarPersonajes())

//función para eliminar un personaje
const confirmacion = ref<{ mensaje: string; ejecutar: () => void } | null>(null)
const aviso = ref<string | null>(null)

const eliminarPersonaje = (idPersonaje: number) => {
  confirmacion.value = {
    mensaje: "¿Seguro que quieres eliminar este personaje?",
    ejecutar: async () => {
      try {
        await api.delete(`/personajes/${idPersonaje}`)
        personajes.value = personajes.value.filter(
          (p) => p.idPersonaje !== idPersonaje
        )
      } catch (error) {
        aviso.value = 'Error al eliminar el personaje.'
      }
    },
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
  cargarPersonajes(paginaActual.value)
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

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Personajes</span>
        <h1 class="pl-title">Lista de tus Personajes</h1>
        <p class="pl-lead">Gestiona tus personajes, edítalos y organiza sus categorías.</p>
        <div class="pl-toolbar">
          <router-link to="/personajes/crear" class="pl-btn pl-btn--success">
            <i class="bi bi-plus-lg" aria-hidden="true"></i> Crear Nuevo
          </router-link>
        </div>
      </header>

      <div v-if="mensajePersonajeCreado" class="pl-alert pl-alert--success">
        <i class="bi bi-check-circle" aria-hidden="true"></i>
        {{ mensajePersonajeCreado }}
      </div>

      <div v-if="personajes.length === 0" class="pl-empty-state">
        <span class="pl-empty-state__icon" aria-hidden="true">
          <i class="bi bi-person-plus"></i>
        </span>
        <p>No tienes personajes creados todavía. ¡Empieza creando uno!</p>
      </div>

      <div v-else class="row g-4">
        <div
          class="col-md-6 col-lg-4"
          v-for="personaje in personajes"
          :key="personaje.idPersonaje"
        >
          <article class="card personaje-card h-100">
            <div class="personaje-card__media">
              <img
                :src="avatarUrl(personaje.avatar)"
                alt="Avatar del personaje"
              />
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="personaje-card__title">{{ personaje.nombre }}</h5>

              <ul class="personaje-card__meta">
                <li><i class="bi bi-gender-ambiguous" aria-hidden="true"></i> {{ personaje.genero }}</li>
                <li><i class="bi bi-stars" aria-hidden="true"></i> {{ personaje.raza }}</li>
                <li><i class="bi bi-shield" aria-hidden="true"></i> {{ personaje.clase }}</li>
              </ul>

              <div class="trasfondo-preview mb-3" v-sanitize="personaje.trasfondo"></div>

              <div class="d-grid gap-2 mt-auto">
                <router-link
                  :to="`/personaje/${personaje.idPersonaje}`"
                  class="pl-btn pl-btn--primary"
                >
                  Ver Perfil Completo
                </router-link>
                <router-link
                  :to="`/personajes/editar/${personaje.idPersonaje}`"
                  class="pl-btn pl-btn--secondary"
                >
                  Editar Perfil
                </router-link>
                <button
                  type="button"
                  @click="abrirModalCategorias(personaje.idPersonaje)"
                  class="pl-btn pl-btn--ghost"
                >
                  Gestionar Categorías
                </button>
                <button
                  type="button"
                  class="pl-btn pl-btn--danger"
                  @click="eliminarPersonaje(personaje.idPersonaje)"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <AnadirCategoriaForm
        v-if="mostrarModal"
        :idPersonaje="personajeSeleccionadoId!"
        @close="mostrarModal = false"
        @success="recargarDatos"
      />

      <PaginadorComponent
        :paginaActual="paginaActual"
        :totalPaginas="totalPaginas"
        @cambiar="cargarPersonajes"
      />
    </div>
  </main>

  <Footer />

  <!-- Modal: Confirmación -->
  <ModalConfirmacion
    v-if="confirmacion"
    :mensaje="confirmacion.mensaje"
    titulo="Eliminar personaje"
    boton-confirmar="Eliminar"
    :peligro="true"
    @confirmar="confirmacion.ejecutar(); confirmacion = null"
    @cancelar="confirmacion = null"
  />

  <!-- Modal: Aviso -->
  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>
<style scoped>
.personaje-card {
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.personaje-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--pl-shadow-lg);
}

.personaje-card__media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #1e2746, #303b63);
}

.personaje-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.personaje-card:hover .personaje-card__media img {
  transform: scale(1.05);
}

.personaje-card__title {
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--pl-ink);
}

.personaje-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
  color: var(--pl-muted);
  font-size: 0.88rem;
}

.personaje-card__meta i {
  margin-right: 0.3rem;
  color: var(--pl-primary);
}

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
<script setup lang="ts">
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../services/api'
import { userStore } from '../../store/userStore'
import AnadirCategoriaForm from './AnadirCategoriaForm.vue'
import PaginadorComponent from '../../components/PaginadorComponent.vue'
import ModalConfirmacion from '../../components/ModalConfirmacion.vue'
import ModalAviso from '../../components/ModalAviso.vue'
import TarjetaPersonaje from '../../components/TarjetaPersonaje.vue'

const TAMANIO_PAGINA = 6

interface PersonajeResumen {
  idPersonaje: number
  nombre: string
  genero: string | null
  raza: string | null
  clase: string | null
  edadPersonaje: number | null
  avatar: string | null
  trasfondo: string | null
}

const route = useRoute()
const router = useRouter()

const personajes = ref<PersonajeResumen[]>([])
const paginaActual = ref(0)
const totalPaginas = ref(0)
const totalPersonajes = ref(0)
const cargando = ref(true)
const errorCarga = ref<string | null>(null)
const mensaje = ref<string | null>(null)

const confirmacion = ref<{ mensaje: string; ejecutar: () => Promise<void> } | null>(null)
const aviso = ref<string | null>(null)

const mostrarModalCategorias = ref(false)
const personajeSeleccionadoId = ref<number | null>(null)
const personajeSeleccionadoNombre = ref('')

const resumenPersonajes = computed(() => {
  if (cargando.value) return 'Cargando personajes…'
  if (errorCarga.value) return 'No disponible'
  if (totalPersonajes.value === 1) return '1 personaje'
  return `${totalPersonajes.value} personajes`
})

const cargarPersonajes = async (pagina = 0) => {
  cargando.value = true
  errorCarga.value = null

  // El guard de rutas hidrata el usuario, pero si el token aparecio despues de
  // cargar la app se reintenta aqui antes de dar la sesion por perdida.
  const userId = userStore.hidratarDesdeToken()

  if (!userId) {
    personajes.value = []
    totalPaginas.value = 0
    totalPersonajes.value = 0
    cargando.value = false
    void router.replace({ path: '/login' })
    return
  }

  try {
    const { data } = await api.get(`/personajes/usuario/${userId}`, {
      params: { page: pagina, size: TAMANIO_PAGINA },
    })
    personajes.value = data.content ?? []
    totalPaginas.value = data.totalPages ?? 0
    totalPersonajes.value = data.totalElements ?? personajes.value.length
    paginaActual.value = pagina
  } catch {
    personajes.value = []
    totalPaginas.value = 0
    totalPersonajes.value = 0
    errorCarga.value = 'No pudimos cargar tus personajes. Revisa tu conexión e inténtalo de nuevo.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  if (route.query.creacion === 'ok') {
    mensaje.value = 'Personaje creado correctamente. Ya puedes verlo, editarlo o asignarle categorías.'
    const query = { ...route.query }
    delete query.creacion
    void router.replace({ query })
  }

  void cargarPersonajes()
})

const eliminarPersonaje = (personaje: PersonajeResumen) => {
  confirmacion.value = {
    mensaje: `¿Seguro que quieres eliminar a «${personaje.nombre}»? Esta acción no se puede deshacer.`,
    ejecutar: async () => {
      try {
        await api.delete(`/personajes/${personaje.idPersonaje}`)
        // Al borrar el unico personaje de la ultima pagina, retrocedemos para no dejar la vista vacia.
        const destino = personajes.value.length === 1 && paginaActual.value > 0
          ? paginaActual.value - 1
          : paginaActual.value
        await cargarPersonajes(destino)
      } catch {
        aviso.value = 'No pudimos eliminar el personaje. Inténtalo de nuevo.'
      }
    },
  }
}

const abrirModalCategorias = (idPersonaje: number, nombre: string) => {
  personajeSeleccionadoId.value = idPersonaje
  personajeSeleccionadoNombre.value = nombre
  mostrarModalCategorias.value = true
}

const recargarDatos = async () => {
  await cargarPersonajes(paginaActual.value)
}
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Personajes</span>
        <h1 class="pl-title">Tus personajes</h1>
        <p class="pl-lead">
          Revisa tus fichas, edita sus datos y organiza las categorías de cada personaje.
        </p>
      </header>

      <div class="pl-toolbar personajes-toolbar">
        <p class="personajes-contador">{{ resumenPersonajes }}</p>
        <div class="personajes-toolbar__acciones">
          <router-link to="/personajes/buscar" class="pl-btn pl-btn--secondary">
            <i class="bi bi-search" aria-hidden="true"></i>
            Buscar personajes
          </router-link>
          <router-link to="/personajes/crear" class="pl-btn pl-btn--primary">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Crear personaje
          </router-link>
        </div>
      </div>

      <div v-if="mensaje" class="pl-alert pl-alert--success" role="status">
        <i class="bi bi-check-circle" aria-hidden="true"></i>
        <span>{{ mensaje }}</span>
      </div>

      <div v-if="errorCarga" class="pl-alert pl-alert--danger" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <span>{{ errorCarga }}</span>
        <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="cargarPersonajes(paginaActual)">
          Reintentar
        </button>
      </div>

      <p v-if="cargando" class="visually-hidden" role="status">Cargando tus personajes…</p>

      <div v-if="cargando" class="personajes-grid" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="personaje-esqueleto"></div>
      </div>

      <div v-else-if="!errorCarga && personajes.length === 0" class="pl-empty-state">
        <span class="pl-empty-state__icon" aria-hidden="true">
          <i class="bi bi-person-plus"></i>
        </span>
        <h2 class="pl-empty-state__title">Todavía no tienes personajes</h2>
        <p>Crea tu primer personaje para empezar a participar en las historias.</p>
        <router-link to="/personajes/crear" class="pl-btn pl-btn--primary">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Crear mi primer personaje
        </router-link>
      </div>

      <div v-else-if="!errorCarga" class="personajes-grid">
        <TarjetaPersonaje
          v-for="personaje in personajes"
          :key="personaje.idPersonaje"
          :personaje="personaje"
        >
          <template #acciones>
            <router-link
              :to="`/personajes/editar/${personaje.idPersonaje}`"
              class="pl-btn pl-btn--secondary pl-btn--sm"
            >
              <i class="bi bi-pencil-square" aria-hidden="true"></i>
              Editar<span class="visually-hidden"> {{ personaje.nombre }}</span>
            </router-link>
            <button
              type="button"
              class="pl-btn pl-btn--ghost pl-btn--sm"
              @click="abrirModalCategorias(personaje.idPersonaje, personaje.nombre)"
            >
              <i class="bi bi-tags" aria-hidden="true"></i>
              Categorías<span class="visually-hidden"> de {{ personaje.nombre }}</span>
            </button>
            <button
              type="button"
              class="pl-btn pl-btn--danger-ghost pl-btn--sm"
              @click="eliminarPersonaje(personaje)"
            >
              <i class="bi bi-trash3" aria-hidden="true"></i>
              Eliminar<span class="visually-hidden"> a {{ personaje.nombre }}</span>
            </button>
          </template>
        </TarjetaPersonaje>
      </div>

      <AnadirCategoriaForm
        v-if="mostrarModalCategorias && personajeSeleccionadoId !== null"
        :idPersonaje="personajeSeleccionadoId"
        :nombre-personaje="personajeSeleccionadoNombre"
        @close="mostrarModalCategorias = false"
        @success="recargarDatos"
      />

      <PaginadorComponent
        v-if="!cargando && !errorCarga"
        :paginaActual="paginaActual"
        :totalPaginas="totalPaginas"
        @cambiar="cargarPersonajes"
      />
    </div>
  </main>

  <Footer />

  <ModalConfirmacion
    v-if="confirmacion"
    :mensaje="confirmacion.mensaje"
    titulo="Eliminar personaje"
    boton-confirmar="Eliminar"
    :peligro="true"
    @confirmar="confirmacion.ejecutar(); confirmacion = null"
    @cancelar="confirmacion = null"
  />

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.personajes-toolbar {
  flex-wrap: wrap;
}

.personajes-contador {
  margin: 0;
  color: var(--pl-muted);
  font-size: 0.92rem;
  font-weight: 650;
}

.personajes-toolbar__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.personajes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

.pl-empty-state__title {
  margin: 0 0 0.35rem;
  color: var(--pl-ink);
  font-size: 1.15rem;
  font-weight: 800;
}

.pl-empty-state p {
  max-width: 46ch;
  margin-bottom: 1.1rem;
}

.pl-alert button {
  margin-left: auto;
}

.personaje-esqueleto {
  min-height: 380px;
  border-radius: var(--pl-radius-lg);
  background: linear-gradient(
    100deg,
    var(--pl-surface-soft) 30%,
    var(--pl-surface) 50%,
    var(--pl-surface-soft) 70%
  );
  background-size: 200% 100%;
  box-shadow: inset 0 0 0 1px var(--pl-border);
  animation: personaje-esqueleto 1.4s ease-in-out infinite;
}

@keyframes personaje-esqueleto {
  to {
    background-position: -200% 0;
  }
}

/* Sin movimiento: el esqueleto se queda como bloque estatico con el mismo tinte. */
@media (prefers-reduced-motion: reduce) {
  .personaje-esqueleto {
    animation: none;
  }
}

@media (max-width: 575.98px) {
  .personajes-toolbar__acciones {
    width: 100%;
  }

  .personajes-toolbar__acciones .pl-btn {
    flex: 1 1 auto;
  }
}
</style>

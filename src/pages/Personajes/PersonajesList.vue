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

const BASE_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${BASE_URL}/images/AVATAR.png`
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

const resumenPersonajes = computed(() => {
  if (cargando.value) return 'Cargando personajes…'
  if (errorCarga.value) return 'No disponible'
  if (totalPersonajes.value === 1) return '1 personaje'
  return `${totalPersonajes.value} personajes`
})

const cargarPersonajes = async (pagina = 0) => {
  const userId = userStore.usuario.value?.id

  cargando.value = true
  errorCarga.value = null

  if (!userId) {
    personajes.value = []
    totalPaginas.value = 0
    totalPersonajes.value = 0
    errorCarga.value = 'No pudimos identificar tu cuenta. Vuelve a iniciar sesión.'
    cargando.value = false
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

const abrirModalCategorias = (idPersonaje: number) => {
  personajeSeleccionadoId.value = idPersonaje
  mostrarModalCategorias.value = true
}

const recargarDatos = async () => {
  await cargarPersonajes(paginaActual.value)
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

function usarAvatarDefecto(event: Event) {
  const img = event.target as HTMLImageElement
  if (img.dataset.fallback === '1') return
  img.dataset.fallback = '1'
  img.src = AVATAR_DEFECTO
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
        <article
          v-for="personaje in personajes"
          :key="personaje.idPersonaje"
          class="pl-card personaje-card"
        >
          <img
            class="personaje-card__media"
            :src="avatarUrl(personaje.avatar)"
            alt=""
            width="640"
            height="400"
            loading="lazy"
            decoding="async"
            @error="usarAvatarDefecto"
          />

          <h2 class="personaje-card__title">
            <router-link
              :to="`/personaje/${personaje.idPersonaje}`"
              class="personaje-card__link"
            >
              {{ personaje.nombre }}
              <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </router-link>
          </h2>

          <ul class="personaje-card__meta">
            <li v-if="personaje.genero">
              <i class="bi bi-gender-ambiguous" aria-hidden="true"></i>
              {{ personaje.genero }}
            </li>
            <li v-if="personaje.raza">
              <i class="bi bi-stars" aria-hidden="true"></i>
              {{ personaje.raza }}
            </li>
            <li v-if="personaje.clase">
              <i class="bi bi-shield" aria-hidden="true"></i>
              {{ personaje.clase }}
            </li>
            <li v-if="personaje.edadPersonaje !== null">
              <i class="bi bi-hourglass-split" aria-hidden="true"></i>
              {{ personaje.edadPersonaje }} años
            </li>
          </ul>

          <div class="personaje-card__content">
            <div
              v-if="personaje.trasfondo"
              class="personaje-card__trasfondo"
              v-sanitize="personaje.trasfondo"
            ></div>
            <p v-else class="personaje-card__sin-trasfondo">Sin trasfondo todavía.</p>
          </div>

          <footer class="personaje-card__actions">
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
              @click="abrirModalCategorias(personaje.idPersonaje)"
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
          </footer>
        </article>
      </div>

      <AnadirCategoriaForm
        v-if="mostrarModalCategorias && personajeSeleccionadoId !== null"
        :idPersonaje="personajeSeleccionadoId"
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

.personaje-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.personaje-card__media {
  display: block;
  width: 100%;
  /* Sin esto el atributo height del <img> gana al aspect-ratio y descuadra la tarjeta. */
  height: auto;
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, rgba(var(--pl-primary-rgb), 0.16), rgba(var(--pl-cyan-rgb), 0.2));
  object-fit: cover;
  object-position: center 30%;
  transition: transform 0.3s ease;
}

.personaje-card__title {
  margin: 0;
  padding: 1rem 1.1rem 0;
  font-size: 1.22rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: var(--pl-ink);
}

.personaje-card__link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  color: inherit;
  text-decoration: none;
}

.personaje-card__link i {
  color: var(--pl-primary);
  font-size: 0.9em;
  transition: transform 0.2s ease;
}

.personaje-card__link:focus-visible {
  outline: none;
}

/* Enlace estirado: toda la tarjeta navega al perfil, sin anidar controles. */
.personaje-card__link::after {
  content: "";
  position: absolute;
  inset: 0;
}

.personaje-card__actions :is(a, button) {
  position: relative;
  z-index: 1;
}

.personaje-card:has(.personaje-card__link:hover) {
  border-color: rgba(var(--pl-primary-rgb), 0.22);
  box-shadow: var(--pl-shadow-lg);
  transform: translateY(-2px);
}

.personaje-card:has(.personaje-card__link:hover) .personaje-card__media {
  transform: scale(1.04);
}

.personaje-card:has(.personaje-card__link:hover) .personaje-card__link i {
  transform: translateX(3px);
}

.personaje-card:has(.personaje-card__link:focus-visible) {
  outline: 3px solid var(--pl-primary);
  outline-offset: 2px;
}

.personaje-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0.75rem 1.1rem 0;
  list-style: none;
}

.personaje-card__meta li {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  color: var(--pl-muted);
  background: var(--pl-surface-soft);
  box-shadow: inset 0 0 0 1px var(--pl-border);
  font-size: 0.76rem;
  font-weight: 650;
}

.personaje-card__meta i {
  color: var(--pl-primary-ink);
  font-size: 0.9em;
}

.personaje-card__content {
  flex: 1 1 auto;
  padding: 0.85rem 1.1rem 1rem;
}

.personaje-card__trasfondo {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  color: var(--pl-muted);
  font-size: 0.9rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.personaje-card__trasfondo :deep(p),
.personaje-card__trasfondo :deep(ul),
.personaje-card__trasfondo :deep(ol) {
  margin: 0;
}

.personaje-card__sin-trasfondo {
  margin: 0;
  color: var(--pl-muted);
  font-size: 0.9rem;
  font-style: italic;
}

.personaje-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.85rem 1.1rem 1.1rem;
  border-top: 1px solid var(--pl-border);
  background: var(--pl-surface-soft);
}

.personaje-card__actions .pl-btn {
  flex: 1 1 auto;
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

@media (max-width: 575.98px) {
  .personajes-toolbar__acciones {
    width: 100%;
  }

  .personajes-toolbar__acciones .pl-btn {
    flex: 1 1 auto;
  }
}
</style>

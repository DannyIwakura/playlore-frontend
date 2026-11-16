<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
import api from '../services/api'
import { userStore } from '../store/userStore'

let refreshInterval: ReturnType<typeof setInterval> | undefined

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`
const chatUrl = `${window.location.origin}/chat`
const amigos = ref<AmigoDTO[]>([])
const cargandoAmigos = ref(false)
const errorAmigos = ref('')

interface AmigoDTO {
  id: number
  nombre: string
  avatar: string | null
  ultimaConexion: string | null
}

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png') || avatar.includes('default.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) return avatar

  return `${import.meta.env.VITE_API_URL}${avatar}`
}

const amigosRecientes = computed(() =>
  [...amigos.value]
    .sort((a, b) => {
      if (!a.ultimaConexion) return 1
      if (!b.ultimaConexion) return -1
      return new Date(b.ultimaConexion).getTime() - new Date(a.ultimaConexion).getTime()
    })
    .slice(0, 6)
)

function tiempoDesde(fecha: string | null): string {
  if (!fecha) return 'Nunca conectado'
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (min < 1) return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  if (h < 24) return `Hace ${h} h`
  if (d < 7) return `Hace ${d} día${d > 1 ? 's' : ''}`
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

async function cargarAmigos() {
  if (!userStore.usuario.value?.id) return
  cargandoAmigos.value = true
  errorAmigos.value = ''
  try {
    const { data } = await api.get(`/usuarios/${userStore.usuario.value.id}/amigos`)
    amigos.value = data
  } catch {
    errorAmigos.value = 'No se pudieron cargar tus amigos.'
  } finally {
    cargandoAmigos.value = false
  }
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  await cargarAmigos()
  refreshInterval = setInterval(() => {
    cargarAmigos()
  }, 60000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <section class="container">
      <div class="pl-page-header pl-toolbar">
        <div>
          <span class="pl-kicker">Espacio personal</span>
          <h1 class="pl-page-title">Hola, {{ userStore.usuario.value?.username }}</h1>
          <p class="pl-page-description">
            Gestiona tus personajes, conecta con tu comunidad y continúa la próxima escena.
          </p>
        </div>
        <router-link to="/personajes/crear" class="pl-btn pl-btn--primary">
          <i class="bi bi-person-plus-fill me-1" aria-hidden="true"></i>Crear personaje
        </router-link>
      </div>
    </section>

    <section class="container" aria-label="Accesos rápidos">
      <div class="row g-4">
        <div class="col-6 col-md-4 col-xl-3">
          <router-link to="/personajes/crear" class="pl-card pl-card-hover pl-feature-card quick-action-card">
            <span class="pl-icon-tile"><i class="bi bi-person-plus-fill" aria-hidden="true"></i></span>
            <h3>Crear personaje</h3>
            <p>Da vida a un nuevo héroe, villano o aventurero.</p>
            <span class="pl-card-link">
              Abrir creador <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
            </span>
          </router-link>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <a :href="chatUrl" target="_blank" rel="noopener noreferrer" class="pl-card pl-card-hover pl-feature-card quick-action-card">
            <span class="pl-icon-tile pl-icon-tile--cyan"><i class="bi bi-chat-dots-fill" aria-hidden="true"></i></span>
            <h3>Chat por canales</h3>
            <p>Encuentra compañeros y escribe en tiempo real.</p>
            <span class="pl-card-link">
              Abrir chat <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
            </span>
          </a>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <router-link to="/personajes" class="pl-card pl-card-hover pl-feature-card quick-action-card">
            <span class="pl-icon-tile pl-icon-tile--success"><i class="bi bi-person-badge-fill" aria-hidden="true"></i></span>
            <h3>Mis personajes</h3>
            <p>Revisa y administra tus fichas existentes.</p>
            <span class="pl-card-link">
              Ver lista <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
            </span>
          </router-link>
        </div>
        <div class="col-6 col-md-4 col-xl-3">
          <router-link to="/amigos" class="pl-card pl-card-hover pl-feature-card quick-action-card">
            <span class="pl-icon-tile pl-icon-tile--warning"><i class="bi bi-person-heart" aria-hidden="true"></i></span>
            <h3>Amigos</h3>
            <p>Gestiona solicitudes y mantiene la comunidad activa.</p>
            <span class="pl-card-link">
              Abrir amigos <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
            </span>
          </router-link>
        </div>
      </div>
    </section>

    <section class="container pl-section-padded">
      <div class="pl-section-heading">
        <div>
          <span class="pl-kicker">Tu comunidad</span>
          <h2 class="pl-page-title pl-page-title--small">Amigos recientemente conectados</h2>
        </div>
        <router-link to="/amigos" class="pl-btn pl-btn--ghost">
          Gestionar amigos
        </router-link>
      </div>

      <div v-if="cargandoAmigos" class="pl-empty-state pl-empty-state--compact" role="status">
        <div class="spinner-border text-primary" aria-hidden="true"></div>
        <span>Cargando actividad reciente...</span>
      </div>

      <div v-else-if="errorAmigos" class="pl-alert pl-alert--danger" role="alert">
        <i class="bi bi-exclamation-circle-fill me-2" aria-hidden="true"></i>{{ errorAmigos }}
      </div>

      <div v-else-if="amigosRecientes.length === 0" class="pl-empty-state">
        <span class="pl-empty-state__icon"><i class="bi bi-people-fill" aria-hidden="true"></i></span>
        <h3 class="h5 mb-1">Aún no hay actividad</h3>
        <p class="mb-0">Cuando un amigo se conecte, aparecerá aquí.</p>
      </div>

      <div v-else class="row g-3">
        <div
          v-for="amigo in amigosRecientes"
          :key="amigo.id"
          class="col-6 col-md-4 col-xl-3"
        >
          <article class="pl-card pl-card-hover friend-card">
            <div class="friend-card__body">
              <img
                :src="avatarUrl(amigo.avatar)"
                class="pl-avatar friend-card__avatar"
                width="56"
                height="56"
                alt="Avatar de {{ amigo.nombre }}"
              />
              <div class="friend-card__info">
                <h3 class="friend-card__name text-truncate">{{ amigo.nombre }}</h3>
                <small class="text-muted">{{ tiempoDesde(amigo.ultimaConexion) }}</small>
              </div>
              <router-link :to="`/perfil/${amigo.id}`" class="pl-btn pl-btn--ghost btn-sm friend-card__action" title="Ver perfil">
                <i class="bi bi-person me-1" aria-hidden="true"></i>Perfil
              </router-link>
            </div>
          </article>
        </div>
      </div>
    </section>
  </main>

  <Footer :logeado="true" />
</template>

<style scoped>
.pl-section-padded {
  margin-top: 3rem;
}

.pl-section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.pl-section-heading .pl-page-title {
  margin-bottom: 0;
}

.pl-page-title--small {
  font-size: clamp(1.55rem, 3vw, 2.15rem);
}

.pl-card-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1rem;
  color: var(--pl-primary);
  font-size: 0.85rem;
  font-weight: 750;
}

.quick-action-card {
  min-height: 100%;
  padding: 1.35rem;
}

.quick-action-card h3 {
  margin-bottom: 0.45rem;
  font-size: 1rem;
}

.quick-action-card p {
  min-height: 3.4rem;
  margin-bottom: 0;
  color: var(--pl-muted);
  font-size: 0.9rem;
}

.friend-card {
  padding: 1rem;
}

.friend-card__body {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.8rem;
  align-items: center;
}

.friend-card__avatar {
  width: 56px;
  height: 56px;
}

.friend-card__info {
  min-width: 0;
}

.friend-card__name {
  margin-bottom: 0.15rem;
  font-size: 0.98rem;
}

.friend-card__action {
  grid-column: 1 / -1;
  justify-self: start;
  min-height: 36px;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
}

@media (max-width: 575.98px) {
  .pl-section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .pl-section-heading .pl-btn {
    width: fit-content;
  }

  .friend-card__body {
    grid-template-columns: auto minmax(0, 1fr);
  }
}
</style>

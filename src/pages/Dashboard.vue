<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Footer from '../components/Footer.vue';
import NavBar from '../components/NavBar.vue';
import api from '../services/api'
import { userStore } from '../store/userStore'
import 'bootstrap-icons/font/bootstrap-icons.css'

let refreshInterval: ReturnType<typeof setInterval> | undefined

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`
const chatUrl = `${window.location.origin}/chat`
const amigos = ref<AmigoDTO[]>([])
const cargandoAmigos = ref(false)

const miId = computed(() => userStore.usuario.value?.id)

// Interfaz para datos de amigos
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

// Ordena por ultimaConexion desc y toma los 6 más recientes
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
  //Sacamos la diferencia de tiempo con la fecha actual
  const diff = Date.now() - new Date(fecha).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  const d    = Math.floor(diff / 86400000)
  // Calcular dias, horas y si se ha conectado hace muy poco
  if (min < 1)  return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  if (h < 24)   return `Hace ${h} h`
  if (d < 7)    return `Hace ${d} día${d > 1 ? 's' : ''}`
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

async function cargarAmigos() {
  if (!miId.value) return
  cargandoAmigos.value = true
  try {
    const { data } = await api.get(`/usuarios/${miId.value}/amigos`)
    amigos.value = data
  } catch {
    // silencioso
  } finally {
    cargandoAmigos.value = false
  }
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  cargarAmigos()
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

  <!-- Cabecera -->
  <section class="container mt-5">
    <h1>Bienvenido {{ userStore.usuario.value?.username }} al Dashboard</h1>
    <p>Aquí podrás gestionar tus personajes, aventuras y chatear con la comunidad.</p>
  </section>

  <!-- Accesos rápidos -->
  <section class="container mt-4">
    <h2>Accesos rápidos</h2>
    <div class="row">

      <div class="col-md-4 mb-3">
        <router-link
          to="/personajes/crear"
          class="acceso-card text-decoration-none d-flex flex-column align-items-start p-4 rounded-3 border h-100"
        >
          <div class="acceso-icon mb-3">
            <i class="bi bi-person-plus-fill"></i>
          </div>
          <h5 class="fw-bold mb-1 text-body">Crear personaje</h5>
          <p class="text-muted small mb-0">Da vida a tu héroe, villano o aventurero con un par de clics.</p>
        </router-link>
      </div>

      <div class="col-md-4 mb-3">
        <a
          :href="chatUrl"
          target="_blank"
          class="acceso-card text-decoration-none d-flex flex-column align-items-start p-4 rounded-3 border h-100"
        >
          <div class="acceso-icon mb-3">
            <i class="bi bi-chat-dots-fill"></i>
          </div>
          <h5 class="fw-bold mb-1 text-body">Chat por canales</h5>
          <p class="text-muted small mb-0">Únete a conversaciones por canales con otros personajes.</p>
        </a>
      </div>

    </div>
  </section>



  <!-- Amigos recientes -->
  <section class="container mt-4">
    <h2>Amigos recientesmente conectados</h2>

    <div v-if="cargandoAmigos" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="amigosRecientes.length === 0" class="text-center text-muted py-4">
      <i class="bi bi-people fs-1 d-block mb-2 opacity-50"></i>
      <p class="mb-0">Aún no tienes compañeros de aventura.</p>
    </div>

    <div v-else class="row">
      <div
        v-for="amigo in amigosRecientes"
        :key="amigo.id"
        class="col-md-4 mb-3"
      >
        <div class="card">
          <div class="card-body d-flex align-items-center gap-3">
            <img
              :src="avatarUrl(amigo.avatar)"
              class="rounded-circle flex-shrink-0"
              width="48" height="48"
              style="object-fit: cover;"
              alt="Avatar"
            />
            <div class="flex-grow-1 min-w-0">
              <h5 class="card-title mb-0 text-truncate">{{ amigo.nombre }}</h5>
              <small class="text-muted">{{ tiempoDesde(amigo.ultimaConexion) }}</small>
            </div>
            <div class="d-flex flex-column gap-1">
              <router-link :to="`/perfil/${amigo.id}`" class="btn btn-outline-primary btn-sm" title="Ver perfil">
                <i class="bi bi-person"></i>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <Footer :logeado="true" />
</template>

<style scoped>
/* Accesos rápidos */
.acceso-card {
  background: #fff;
  transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
  border-color: #dee2e6 !important;
  cursor: pointer;
}
.acceso-card:hover {
  box-shadow: 0 4px 18px rgba(13, 110, 253, 0.10);
  transform: translateY(-2px);
  border-color: #0d6efd !important;
}

.acceso-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #e7f0ff;
  color: #0d6efd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

/* Tarjetas de amigos */
.amigo-card {
  transition: box-shadow 0.15s;
}
.amigo-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.min-w-0 { min-width: 0; }
</style>
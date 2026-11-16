<script setup lang="ts">
import { useRouter } from 'vue-router'
import { userStore } from '../store/userStore'
import { ref, onMounted, onUnmounted } from 'vue'
import axios from '../services/api'

const props = defineProps<{ logeado: boolean }>()

const BASE_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`
const chatUrl = `${window.location.origin}/chat`

const router = useRouter()
const dropdownAbierto = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownTriggerRef = ref<HTMLButtonElement | null>(null)
const usuario = userStore.usuario
const solicitudesPendientes = ref(0)
const isMenuOpen = ref(false)
const dropdownPersonajesAbierto = ref(false)
const dropdownPersonajesRef = ref<HTMLElement | null>(null)
const dropdownPersonajesTriggerRef = ref<HTMLButtonElement | null>(null)

let heartbeatInterval: ReturnType<typeof setInterval> | undefined

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return `${import.meta.env.VITE_API_URL}${avatar}`
}

function handleClickFuera(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownAbierto.value = false
  }
  if (dropdownPersonajesRef.value && !dropdownPersonajesRef.value.contains(e.target as Node)) {
    dropdownPersonajesAbierto.value = false
  }
}

function cerrarMenusConEsc() {
  if (dropdownAbierto.value) {
    dropdownAbierto.value = false
    dropdownTriggerRef.value?.focus()
  }
  if (dropdownPersonajesAbierto.value) {
    dropdownPersonajesAbierto.value = false
    dropdownPersonajesTriggerRef.value?.focus()
  }
}

function cerrarAlSalirFoco(e: FocusEvent, contenedor: HTMLElement | null, cerrar: () => void) {
  const siguiente = e.relatedTarget as Node | null
  if (siguiente && contenedor?.contains(siguiente)) return
  cerrar()
}

const logout = () => {
  localStorage.removeItem('token')
  userStore.setUsuario(null)
  router.push('/login')
}

onMounted(async () => {
  if (props.logeado && usuario.value?.id) {
    try {
      const { data } = await axios.get(`/amistades/pendientes-recibidas/${usuario.value.id}`)
      solicitudesPendientes.value = data.length
    } catch (_) {}
    try {
      await axios.put(`/usuarios/${usuario.value.id}/ultima-conexion`)
      heartbeatInterval = setInterval(() => {
        if (usuario.value?.id) {
          axios.put(`/usuarios/${usuario.value.id}/ultima-conexion`).catch(() => {})
        }
      }, 60000)
    } catch (_) {}
  }
})

onUnmounted(() => {
  if (heartbeatInterval) clearInterval(heartbeatInterval)
})

</script>

<template>
  <nav
    class="navbar navbar-pl navbar-expand-lg navbar-dark"
    aria-label="Navegación principal"
    @keydown.esc="cerrarMenusConEsc"
  >
    <div class="container-fluid px-lg-4">
      <router-link
        class="navbar-brand navbar-brand-pl"
        :to="props.logeado ? '/dashboard' : '/'"
      >
        <img src="../assets/img/lOGOpLAYlORE.png" class="navbar-logo" height="40" alt="PlayLore" />
        <span class="navbar-brand-text">Play<span>Lore</span></span>
      </router-link>

      <button
        class="navbar-toggler navbar-toggler-pl"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarText"
        aria-controls="navbarText"
        aria-expanded="false"
        aria-label="Abrir menú"
        @shown="isMenuOpen = true"
        @hidden="isMenuOpen = false"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarText" :class="{ 'is-open': isMenuOpen }">
        <ul class="navbar-nav navbar-nav-pl me-auto" v-if="!props.logeado">
          <li class="nav-item">
            <router-link to="/" class="nav-link nav-link-pl">Inicio</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/#sobre" class="nav-link nav-link-pl">Sobre nosotros</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/#join" class="nav-link nav-link-pl">Únete</router-link>
          </li>
        </ul>

        <ul class="navbar-nav navbar-nav-pl me-auto" v-if="props.logeado">
          <li class="nav-item">
            <router-link to="/dashboard" class="nav-link nav-link-pl">
              <i class="bi bi-speedometer2 me-2" aria-hidden="true"></i>Dashboard
            </router-link>
          </li>

          <li
            class="nav-item dropdown-personajes"
            ref="dropdownPersonajesRef"
            @focusout="cerrarAlSalirFoco($event, dropdownPersonajesRef, () => (dropdownPersonajesAbierto = false))"
          >
            <button
              type="button"
              ref="dropdownPersonajesTriggerRef"
              class="nav-link btn-nav-dropdown"
              :aria-expanded="dropdownPersonajesAbierto"
              aria-controls="personajes-menu"
              @click.stop="dropdownPersonajesAbierto = !dropdownPersonajesAbierto"
            >
              <i class="bi bi-people-fill me-2" aria-hidden="true"></i>Personajes
              <span class="caret" :class="{ open: dropdownPersonajesAbierto }" aria-hidden="true">▼</span>
            </button>
            <div class="dropdown-menu dropdown-personajes-menu" v-if="dropdownPersonajesAbierto" id="personajes-menu">
              <router-link to="/personajes" class="dropdown-item" @click="dropdownPersonajesAbierto = false">
                <i class="bi bi-person-lines-fill me-2" aria-hidden="true"></i>Mis personajes
              </router-link>
              <router-link to="/personajes/buscar" class="dropdown-item" @click="dropdownPersonajesAbierto = false">
                <i class="bi bi-search me-2" aria-hidden="true"></i>Buscar personajes
              </router-link>
            </div>
          </li>

          <li class="nav-item">
            <a :href="chatUrl" target="_blank" rel="noopener noreferrer" class="nav-link nav-link-pl">
              <i class="bi bi-chat-dots-fill me-2" aria-hidden="true"></i>Chat
            </a>
          </li>

          <li class="nav-item">
            <router-link to="/amigos" class="nav-link nav-link-pl">
              <i class="bi bi-person-heart me-2" aria-hidden="true"></i>Amigos
              <span
                v-if="solicitudesPendientes > 0"
                class="badge rounded-pill navbar-badge"
                :aria-label="solicitudesPendientes + ' solicitudes pendientes'"
              >
                {{ solicitudesPendientes }}
              </span>
            </router-link>
          </li>

          <li class="nav-item" v-if="usuario?.role === 'ADMIN' || usuario?.role === 'MOD'">
            <router-link to="/admin" class="nav-link nav-link-pl">
              <i class="bi bi-shield-lock-fill me-2" aria-hidden="true"></i>Panel de Administración
            </router-link>
          </li>
        </ul>

        <div class="navbar-actions d-flex align-items-center gap-2">
          <template v-if="usuario">
            <div
              class="user-dropdown"
              ref="dropdownRef"
              @focusout="cerrarAlSalirFoco($event, dropdownRef, () => (dropdownAbierto = false))"
            >
              <img
                :src="avatarUrl(usuario.avatar)"
                class="avatar-navbar"
                alt="Avatar de usuario"
              />

              <button
                type="button"
                ref="dropdownTriggerRef"
                class="user-trigger"
                :aria-expanded="dropdownAbierto"
                aria-controls="usuario-menu"
                @click.stop="dropdownAbierto = !dropdownAbierto"
              >
                <span class="user-name">Hola, {{ usuario.username }}</span>
                <span class="caret" :class="{ open: dropdownAbierto }" aria-hidden="true">▼</span>
              </button>

              <div class="dropdown-menu" v-if="dropdownAbierto" id="usuario-menu">
                <router-link
                  :to="`/perfil/${usuario.id}`"
                  class="dropdown-item"
                  @click="dropdownAbierto = false"
                >
                  Mi perfil
                </router-link>
                <router-link
                  :to="`/usuario/editar/${usuario.id}`"
                  class="dropdown-item"
                  @click="dropdownAbierto = false"
                >
                  Editar datos
                </router-link>
              </div>
            </div>
          </template>

          <button
            v-if="props.logeado"
            type="button"
            class="btn btn-outline-light btn-pl"
            @click="logout"
          >
            Cerrar sesión
          </button>

          <router-link v-if="!props.logeado" to="/login" class="btn btn-outline-light btn-pl">
            Acceder
          </router-link>

          <router-link v-if="!props.logeado" to="/registro" class="btn btn-pl btn-pl--primary">
            Registrarse
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.avatar-navbar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.user-dropdown {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-trigger {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  font-size: 0.88rem;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.user-trigger:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.24);
}

.caret {
  font-size: 0.6rem;
  opacity: 0.7;
  transition: transform 0.2s ease;
}

.caret.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  display: block;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  padding: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--pl-radius-md);
  background: #fff;
  box-shadow: var(--pl-shadow-md);
  z-index: 1065;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  padding: 0.6rem 0.75rem;
  color: var(--pl-ink);
  font-size: 0.875rem;
  transition: background 0.12s ease, color 0.12s ease;
}

.dropdown-item:hover {
  background: var(--pl-bg-soft);
  color: var(--pl-primary);
}

.dropdown-personajes {
  position: relative;
}

.btn-nav-dropdown {
  background: transparent;
  border: 1px solid transparent;
  color: rgba(255, 255, 255, 0.76);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0.55rem 0.8rem;
  font-size: 0.95rem;
  border-radius: var(--pl-radius-md);
  transition: color 0.15s ease, background 0.15s ease;
}

.btn-nav-dropdown:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.dropdown-personajes-menu {
  display: block;
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 210px;
  padding: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--pl-radius-md);
  background: #fff;
  box-shadow: var(--pl-shadow-md);
  z-index: 1065;
  overflow: hidden;
}

.navbar-pl {
  position: sticky;
  top: 0;
  z-index: 1030;
  min-height: 76px;
  padding: 0.7rem 0;
  background: rgba(21, 27, 44, 0.94);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.navbar-pl::after {
  position: absolute;
  right: 8%;
  bottom: -1px;
  width: 100px;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(91, 84, 217, 0.9), rgba(34, 195, 197, 0.6));
  content: "";
}

.navbar-brand-pl {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: #fff;
  font-size: 1.15rem;
  font-weight: 850;
  letter-spacing: -0.04em;
}

.navbar-brand-pl:hover {
  color: #fff;
  transform: none;
}

.navbar-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.navbar-brand-text span {
  color: var(--pl-cyan);
}

.navbar-toggler-pl {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--pl-radius-md);
  background: rgba(255, 255, 255, 0.08);
}

.navbar-toggler-pl:focus-visible {
  outline: 3px solid rgba(var(--pl-primary-rgb), 0.4);
  outline-offset: 3px;
}

.navbar-toggler-icon {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  vertical-align: -0.125em;
  border: 2px solid currentColor;
  border-radius: 999px;
  background: linear-gradient(currentColor 0 0) no-repeat 0.18em 0.28em / 100% 2px,
    linear-gradient(currentColor 0 0) no-repeat 0.18em 0.62em / 100% 2px,
    linear-gradient(currentColor 0 0) no-repeat 0.18em 0.96em / 100% 2px;
}

.navbar-nav-pl {
  align-items: center;
}

.nav-link-pl {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem !important;
  color: rgba(255, 255, 255, 0.76) !important;
  border-radius: var(--pl-radius-md);
  font-weight: 650;
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-link-pl:hover,
.nav-link-pl.active {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.1);
}

.navbar-badge {
  min-width: 20px;
  padding-inline: 0.4rem;
  color: #fff;
  background: var(--pl-danger);
  font-size: 0.68rem;
}

.navbar-actions {
  flex-shrink: 0;
}

.btn-pl {
  min-height: 40px;
  padding: 0.55rem 0.85rem;
  font-size: 0.875rem;
}

.btn-pl--primary {
  color: #fff;
  background: var(--pl-primary);
  border-color: transparent;
  box-shadow: var(--pl-shadow-sm);
}

.btn-pl--primary:hover {
  color: #fff;
  background: var(--pl-primary-dark);
}

@media (max-width: 991.98px) {
  .navbar-pl {
    min-height: 68px;
  }

  .navbar-collapse {
    margin-top: 0.65rem;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--pl-radius-lg);
    background: rgba(23, 32, 51, 0.98);
  }

  .navbar-collapse.is-open {
    box-shadow: var(--pl-shadow-lg);
  }

  .navbar-nav-pl {
    gap: 0.25rem;
  }

  .nav-link-pl {
    width: 100%;
    padding: 0.7rem 0.8rem !important;
  }

  .navbar-actions {
    margin-top: 0.65rem;
    flex-wrap: wrap;
  }

  .navbar-actions .btn-pl {
    flex: 1 1 130px;
  }

  .dropdown-menu,
  .dropdown-personajes-menu {
    position: static;
    margin: 0.3rem 0 0.55rem;
    box-shadow: none;
  }

  .user-dropdown {
    width: 100%;
  }

  .user-trigger {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 575.98px) {
  .navbar-pl {
    min-height: 62px;
    padding: 0.5rem 0;
  }

  .navbar-brand-pl {
    font-size: 1rem;
  }

  .navbar-logo {
    width: 34px;
    height: 34px;
  }

  .user-name {
    display: none;
  }

  .user-trigger {
    width: 42px;
    height: 42px;
    justify-content: center;
    padding: 0;
    border-radius: 50%;
  }

  .navbar-actions {
    gap: 0.45rem;
  }

  .navbar-actions .btn-pl {
    flex-basis: calc(50% - 0.25rem);
  }
}
</style>
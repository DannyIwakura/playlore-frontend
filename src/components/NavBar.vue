<script setup lang="ts">
import { useRouter } from 'vue-router'
import { userStore } from '../store/userStore'
import { ref, onMounted, onUnmounted } from 'vue'
import axios from '../services/api'

const BASE_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

const router = useRouter()

//constantes para manejar el dropdown del usuario
const dropdownAbierto = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

//extraemos el ref para mantener reactividad
const usuario = userStore.usuario

//inciamos el contador de mensajes no leidos
const mensajesNoLeidos = ref(0)

const props = defineProps<{ logeado: boolean }>()

const dropdownPersonajesAbierto = ref(false)
const dropdownPersonajesRef = ref<HTMLElement | null>(null)

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar

  return `${import.meta.env.VITE_API_URL}${avatar}`
  // → http://localhost:8080/api/uploads/avatars/xxx.jpg  ✅
}
// Actualiza handleClickFuera para cerrar ambos dropdowns:
const handleClickFuera = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node))
    dropdownAbierto.value = false
  if (dropdownPersonajesRef.value && !dropdownPersonajesRef.value.contains(e.target as Node))
    dropdownPersonajesAbierto.value = false
}

onMounted(() => document.addEventListener('click', handleClickFuera))
onUnmounted(() => document.removeEventListener('click', handleClickFuera))

const logout = () => {
  localStorage.removeItem('token')
  userStore.setUsuario(null)
  router.push('/login')
}

onMounted(async () => {
  console.log('avatar en store:', usuario.value?.avatar)
  if (props.logeado && usuario.value?.id) {
    try {
      const { data } = await axios.get(`/mensajes/recibidos/${usuario.value.id}/count-no-leidos`)
      mensajesNoLeidos.value = data
    } catch (_) {}
  }
})

</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container px-4">

      <!-- LOGO -->
      <router-link
        class="navbar-brand"
        :to="props.logeado ? '/dashboard' : '/'"
      >
        <img src="../assets/img/lOGOpLAYlORE.png" height="40" />
      </router-link>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarText"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarText">
        <!-- MENÚ INVITADO -->
        <ul class="navbar-nav me-auto" v-if="!props.logeado">
          <li class="nav-item">
            <a href="/" class="nav-link">Inicio</a>
          </li>
          <li class="nav-item">
            <a href="#sobre" class="nav-link">Sobre nosotros</a>
          </li>
          <li class="nav-item">
            <a href="#join" class="nav-link">Únete</a>
          </li>
        </ul>

        <!-- MENÚ LOGUEADO -->
        <ul class="navbar-nav me-auto" v-if="props.logeado">

          <li class="nav-item">
            <router-link to="/dashboard" class="nav-link">
            <i class="bi bi-speedometer2 me-2"></i>Dashboard
            </router-link>
          </li>

          <li class="nav-item dropdown-personajes" ref="dropdownPersonajesRef">
            <button
              class="nav-link btn-nav-dropdown"
              @click.stop="dropdownPersonajesAbierto = !dropdownPersonajesAbierto"
            >
              <i class="bi bi-people-fill me-2"></i>Personajes
              <span class="caret" :class="{ open: dropdownPersonajesAbierto }">▼</span>
            </button>
            <div class="dropdown-menu dropdown-personajes-menu" v-if="dropdownPersonajesAbierto">
              <router-link to="/personajes" class="dropdown-item"
                @click="dropdownPersonajesAbierto = false">
                <i class="bi bi-person-lines-fill me-2"></i>Mis personajes
              </router-link>
              <router-link to="/personajes/buscar" class="dropdown-item"
                @click="dropdownPersonajesAbierto = false">
                <i class="bi bi-search me-2"></i>Buscar personajes
              </router-link>
            </div>
          </li>

          <li class="nav-item">
            <router-link to="/mensajes" class="nav-link">
              <i class="bi bi-envelope-fill me-2"></i>Mensajes Privados
              <span
              v-if="mensajesNoLeidos > 0"
              class="badge bg-danger rounded-pill"
              style="font-size: 0.7rem">
                {{ mensajesNoLeidos }}
              </span>
            </router-link>
          </li>

          <li class="nav-item">
            <router-link to="/amigos" class="nav-link">
              <i class="bi bi-person-heart me-2"></i>Amigos
            </router-link>
          </li>

          <li class="nav-item" v-if="usuario?.role === 'ADMIN'">
          <router-link to="/admin" class="nav-link">
          <i class="bi bi-shield-lock-fill me-2"></i>Panel de Administración
          </router-link>
          </li>

        </ul>

        <!-- DERECHA -->
        <div class="ms-auto d-flex align-items-center gap-2">

          <!-- AVATAR + USER -->
          <template v-if="usuario">
  <div class="user-dropdown" ref="dropdownRef">
    <img
      :src="avatarUrl(usuario.avatar)"
      class="avatar-navbar"
      alt="avatar"
    />


    <button class="user-trigger" @click.stop="dropdownAbierto = !dropdownAbierto">
      Hola, {{ usuario.username }}
      <span class="caret" :class="{ open: dropdownAbierto }">▼</span>
    </button>

    <div class="dropdown-menu" v-if="dropdownAbierto">
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

          <!-- BOTONES -->
          <button
            v-if="props.logeado"
            class="btn btn-outline-danger"
            @click="logout"
          >
            Cerrar sesión
          </button>

          <router-link v-if="!props.logeado" to="/login" class="btn btn-outline-light">
            Acceder
          </router-link>

          <router-link v-if="!props.logeado" to="/registro" class="btn btn-outline-light">
            Registrarse
          </router-link>

        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.avatar-navbar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
}

.user-dropdown {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-trigger {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: background 0.15s;
}

.user-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
}

.caret {
  font-size: 0.6rem;
  opacity: 0.6;
  transition: transform 0.2s;
}

.caret.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  display: block;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  min-width: 170px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  padding: 10px 16px;
  color: #212529;
  text-decoration: none;
  font-size: 0.875rem;
  transition: background 0.12s;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-personajes { position: relative; }

.btn-nav-dropdown {
  background: none; border: none; color: rgba(255,255,255,.55);
  cursor: pointer; display: flex; align-items: center; gap: 5px;
  padding: 0.5rem 1rem; font-size: 1rem; transition: color .15s;
}
.btn-nav-dropdown:hover { color: #fff; }

.dropdown-personajes-menu {
  display: block; position: absolute;
  top: calc(100% + 4px); left: 0;
  background: white; border: 1px solid rgba(0,0,0,.15);
  border-radius: 8px; min-width: 190px;
  box-shadow: 0 4px 16px rgba(0,0,0,.15); z-index: 1000; overflow: hidden;
}
</style>
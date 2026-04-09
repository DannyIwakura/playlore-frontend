<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { jwtDecode } from 'jwt-decode';
import { userStore } from '../store/userStore'

// constante para hacer comprobaciones de rutas
const route = useRoute()
const router = useRouter()

// usuario logueado
const props = defineProps<{ logeado: boolean }>()

const logout = () => {
  localStorage.removeItem('token');
  router.push('/login');
};
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container px-4">
      <a class="navbar-brand" href="/" v-if="!props.logeado">
      <img 
        src="../assets/img/lOGOpLAYlORE.png"
        alt="PlayLole" 
        height="40"
        class="d-inline-block align-text-top"
      >
      </a>

      <a class="navbar-brand" href="/dashboard" v-if="props.logeado">
      <img 
        src="../assets/img/lOGOpLAYlORE.png" 
        alt="PlayLole" 
        height="40"
        class="d-inline-block align-text-top"
      >
      </a>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarText"
        aria-controls="navbarText"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarText">
        <!-- Enlaces internos solo en Home -->
        <ul class="navbar-nav me-auto" v-if="route.path === '/' && !props.logeado">
          <li class="nav-item">
            <a :class="['nav-link', route.path === '/' ? 'active' : '']" href="#">Inicio</a>
          </li>
          <li class="nav-item">
            <a :class="['nav-link', route.hash === '#sobre' ? 'active' : '']" href="#sobre">Qué es PlayLole</a>
          </li>
          <li class="nav-item">
            <a :class="['nav-link', route.hash === '#join' ? 'active' : '']" href="#join">Cómo entrar</a>
          </li>
        </ul>

        <!-- Enlaces cuando el usuario está logueado -->
        <ul class="navbar-nav me-auto" v-if="props.logeado">
          <li class="nav-item">
            <router-link
              to="/dashboard"
              class="nav-link"
              :class="{ active: route.path === '/dashboard' }"
            >Dashboard</router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="/personajes"
              class="nav-link"
              :class="{ active: route.path === '/personajes' }"
            >Personajes</router-link>
          </li>
          <li class="nav-item">
              <a
                :class="['nav-link d-flex align-items-center', route.hash === '#join' ? 'active' : '']"
                href="#join"
              >
                <span>Mensajes Privados</span>
                <span class="badge rounded-pill bg-danger ms-2">0</span>
              </a>
          </li>
        </ul>

        <!-- Botones alineados a la derecha -->
        <div class="ms-auto d-flex gap-2 align-items-center">
          <span v-if="props.logeado" class="text-white me-2">Hola, {{ userStore.usuario?.username }}</span>
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
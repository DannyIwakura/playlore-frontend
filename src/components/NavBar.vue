<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { userStore } from '../store/userStore'

const BASE_URL = 'http://localhost:8080/api'

const route = useRoute()
const router = useRouter()

//extraemos el ref para mantener reactividad
const usuario = userStore.usuario

const props = defineProps<{ logeado: boolean }>()

const logout = () => {
  localStorage.removeItem('token')
  userStore.setUsuario(null)
  router.push('/login')
}
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container px-4">

      <!-- LOGO -->
      <a class="navbar-brand" href="/" v-if="!props.logeado">
        <img src="../assets/img/lOGOpLAYlORE.png" height="40" />
      </a>

      <a class="navbar-brand" href="/dashboard" v-if="props.logeado">
        <img src="../assets/img/lOGOpLAYlORE.png" height="40" />
      </a>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarText"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarText">

        <!-- MENÚ LOGUEADO -->
        <ul class="navbar-nav me-auto" v-if="props.logeado">

          <li class="nav-item">
            <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
          </li>

          <li class="nav-item">
            <router-link to="/personajes" class="nav-link">Personajes</router-link>
          </li>

          <li class="nav-item" v-if="usuario?.role === 'ADMIN'">
          <router-link to="/admin" class="nav-link">Panel de Administración</router-link>
          </li>

        </ul>

        <!-- DERECHA -->
        <div class="ms-auto d-flex align-items-center gap-2">

          <!-- AVATAR + USER -->
          <template v-if="usuario">
            <img
              :src="BASE_URL + usuario.avatar"
              class="avatar-navbar"
              alt="avatar"
            />

            <span class="text-white me-2">
              Hola, {{ usuario.username }}
            </span>
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
</style>
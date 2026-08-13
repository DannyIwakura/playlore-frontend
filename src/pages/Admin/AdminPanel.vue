<script setup lang="ts">
import { ref } from 'vue'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import CategoriasLista from '../Admin/Categorias/CategoriasLista.vue'
import CategoriaNueva from '../Admin/Categorias/CategoriaNueva.vue'
import { userStore } from '../../store/userStore'
import UsuariosLista from '../Admin/Usuarios/UsuariosLista.vue'
import PersonajesLista from '../Admin/Personajes/PersonajesLista.vue'
import DenunciasLista from '../Admin/Denuncias/DenunciasLista.vue'
import BaneosLista from '../Admin/Baneos/BaneosLista.vue'

const usuario = userStore.usuario
const esAdmin = usuario.value?.role === 'ADMIN'
const esModerador = usuario.value?.role === 'MOD'

// Si es moderador, la pestaña inicial será personajes
const pestanaActiva = ref(esAdmin ? 'categorias' : 'personajes')
</script>

<template>
  <NavBar :logeado="true" />

  <section class="container mt-5">
    <h1>Panel de Administrador</h1>
    <p>Bienvenido, {{ userStore.usuario.value?.username }}. Gestiona el contenido de la plataforma.</p>
  </section>

  <section class="container mt-4 mb-5">
    <div class="row">

      <!-- SIDEBAR IZQUIERDO -->
      <div class="col-md-3">
        <div class="list-group">
          <button
            v-if="esAdmin"
            class="list-group-item list-group-item-action"
            :class="{ active: pestanaActiva === 'categorias' }"
            @click="pestanaActiva = 'categorias'"
          >
            Gestión de categorías
          </button>
          <button
            v-if="esAdmin"
            class="list-group-item list-group-item-action"
            :class="{ active: pestanaActiva === 'usuarios' }"
            @click="pestanaActiva = 'usuarios'"
          >
            Gestión de usuarios
          </button>
          <button
            v-if="esAdmin || esModerador"
            class="list-group-item list-group-item-action"
            :class="{ active: pestanaActiva === 'personajes' }"
            @click="pestanaActiva = 'personajes'"
          >
            Gestión de personajes
          </button>
          <button
            v-if="esAdmin || esModerador"
            class="list-group-item list-group-item-action"
            :class="{ active: pestanaActiva === 'denuncias' }"
            @click="pestanaActiva = 'denuncias'"
          >
            Denuncias
          </button>
          <button
            v-if="esAdmin || esModerador"
            class="list-group-item list-group-item-action"
            :class="{ active: pestanaActiva === 'baneos' }"
            @click="pestanaActiva = 'baneos'"
          >
            Baneos globales
          </button>
        </div>
      </div>

      <!-- CONTENIDO DERECHO -->
      <div class="col-md-9">

        <!-- Categorías -->
        <div v-if="pestanaActiva === 'categorias'">
          <h2 class="mb-4">Gestión de categorías</h2>
          <CategoriasLista />
          <hr />
          <h4 class="mt-4">Nueva categoría</h4>
          <CategoriaNueva />
        </div>

        <!-- Usuarios -->
        <div v-if="pestanaActiva === 'usuarios'">
        <h2 class="mb-3">Gestión de usuarios</h2>
        <UsuariosLista />
        </div>
          <div v-if="pestanaActiva === 'personajes' && (esAdmin || esModerador)">
          <h2 class="mb-3">Gestión de personajes</h2>
          <PersonajesLista />
        </div>

        <!-- Denuncias -->
        <div v-if="pestanaActiva === 'denuncias' && (esAdmin || esModerador)">
          <h2 class="mb-3">Denuncias</h2>
          <DenunciasLista />
        </div>

        <!-- Baneos globales -->
        <div v-if="pestanaActiva === 'baneos' && (esAdmin || esModerador)">
          <h2 class="mb-3">Baneos globales</h2>
          <BaneosLista />
        </div>
      </div>
    </div>
  </section>

  <Footer />
</template>
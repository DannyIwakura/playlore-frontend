<script setup lang="ts">
import { ref } from 'vue'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import CategoriasLista from '../Admin/Categorias/CategoriasLista.vue'
import CategoriaNueva from '../Admin/Categorias/CategoriaNueva.vue'
import { userStore } from '../../store/userStore'
import UsuariosLista from '../Admin/Usuarios/UsuariosLista.vue'


const pestanaActiva = ref('categorias')
</script>

<template>
  <NavBar :logeado="true" />

  <section class="container mt-5">
    <h1>Panel de Administrador</h1>
    <p>Bienvenido, {{ userStore.usuario?.username }}. Gestiona el contenido de la plataforma.</p>
  </section>

  <section class="container mt-4 mb-5">
    <div class="row">

      <!-- SIDEBAR IZQUIERDO -->
      <div class="col-md-3">
        <div class="list-group">
          <button
            class="list-group-item list-group-item-action"
            :class="{ active: pestanaActiva === 'categorias' }"
            @click="pestanaActiva = 'categorias'"
          >
            Gestión de categorías
          </button>
          <button
            class="list-group-item list-group-item-action"
            :class="{ active: pestanaActiva === 'usuarios' }"
            @click="pestanaActiva = 'usuarios'"
          >
            Gestión de usuarios
          </button>
          <button
            class="list-group-item list-group-item-action"
            :class="{ active: pestanaActiva === 'noticias' }"
            @click="pestanaActiva = 'noticias'"
          >
            Gestión de noticias
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

        <!-- Noticias -->
        <div v-if="pestanaActiva === 'noticias'">
          <h2 class="mb-4">Gestión de noticias</h2>
          <p class="text-muted">Próximamente...</p>
        </div>

      </div>
    </div>
  </section>

  <Footer />
</template>
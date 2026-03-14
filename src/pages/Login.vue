<script setup lang="ts">
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
import { useRouter } from 'vue-router'
import { ref } from 'vue'

const router = useRouter()
const email = ref('')
const password = ref('')
// Simulación de login
const login = (e: Event) => {
  e.preventDefault() 
  router.push('/dashboard') // navega a Dashboard
}
</script>

<template>
  <NavBar :logeado="false" />

  <div class="container-fluid">
    <div class="row vh-100">

      <!-- Imagen izquierda -->
      <div class="col-md-6 p-0">
        <div class="login-image"></div>
      </div>

      <!-- Formulario derecha -->
      <div class="formulario col-md-6 d-flex align-items-center justify-content-center">
        <div class="w-75">

          <h1 class="mb-4">Iniciar sesión</h1>

          <form @submit="login">
            <div class="mb-3">
              <label for="email" class="form-label">Correo electrónico</label>
              <input v-model="email" type="email" class="form-control" id="email" placeholder="Ingresa tu correo electrónico">
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <input v-model="password" type="password" class="form-control" id="password" placeholder="Ingresa tu contraseña">
            </div>

            <button type="submit" class="btn btn-primary w-100">
              Iniciar sesión
            </button>
          </form>

          <p class="mt-3 text-center">
            ¿No tienes cuenta?
            <router-link to="/registro">Regístrate aquí</router-link>
          </p>

        </div>
      </div>

    </div>
  </div>

  <Footer />
</template>

<style scoped>
.login-image {
  height: 100%;
  width: 100%;
  background-image: url('../assets/img/login-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.formulario {
  background-color: #ebf3e7;
}
</style>
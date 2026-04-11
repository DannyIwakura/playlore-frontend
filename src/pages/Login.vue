<script setup lang="ts">
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
import { useRouter, useRoute  } from 'vue-router'
import { ref, onMounted } from 'vue'
import api from '../services/api'
import { userStore } from '../store/userStore'
import { jwtDecode } from 'jwt-decode';

const router = useRouter()
// Para mostrar el mensaje de registro exitoso
const route = useRoute()

const mensajeRegistro = ref('')

onMounted(() => {
  // Si venimos del registro, mostramos el mensaje de éxito
  if (route.query.registro === 'ok') {
    mensajeRegistro.value = "Usuario creado correctamente. Ya puedes iniciar sesión."
    // Limpiamos la query para que el mensaje no aparezca al recargar la página
    router.replace({ query: {} })
  }
})

//recogemos los datos del formaario
const nombre = ref('')
const password = ref('')
//recogemos errres si los hay
const errorLogin = ref('')

// Metodo para el login
const iniciarSesion = async () => {

  errorLogin.value = ''

  try {
    // Enviamos los datos al backend
    const response = await api.post('/usuarios/login', {
      nombre: nombre.value,
      password: password.value
    })

    //guardammos el token de sesion
    localStorage.setItem("token", response.data)

    //cargamops el token
    userStore.cargarDesdeToken()

    //debug
    console.log(response.data)
    //si el login es correcto, dirigimos al dashboard
    router.push('/dashboard')

  } catch (error: any) {

    if (error.response && error.response.status === 401) {
      errorLogin.value = "Usuario o contraseña incorrectos"
    } else {
      errorLogin.value = "Error al iniciar sesión"
    }
  }

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
          <!-- Mostrasmos mensaje de registro exitoso -->
          <div v-if="mensajeRegistro" class="alert alert-success">
            {{ mensajeRegistro }}
          </div>
          <h1 class="mb-4">Iniciar sesión</h1>

          <form @submit.prevent="iniciarSesion">
            <div class="mb-3">
              <label for="nombre" class="form-label">Nombre de Usuario</label>
              <input v-model="nombre" type="text" class="form-control" id="nombre" placeholder="Ingresa tu nombre de usuario" required>
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <input v-model="password" type="password" class="form-control" id="password" placeholder="Ingresa tu contraseña" required>
            </div>
            <div v-if="errorLogin" class="text-danger mt-2">
                {{ errorLogin }}
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
<script setup lang="ts">
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
</script>

<template>
  <NavBar :logeado="false" />

  <div class="container-fluid">
    <div class="row vh-100">

      <!-- Imagen izquierda -->
      <div class="col-md-6 p-0">
        <div class="register-image"></div>
      </div>

      <!-- Formulario derecha -->
      <div class="formulario col-md-6 d-flex align-items-center justify-content-center">
        <div class="w-75">

          <h1 class="mb-4">Registro</h1>

          <form>
            <div class="mb-3">
              <label for="username" class="form-label">Nombre de usuario</label>
              <input type="text" class="form-control" id="username" placeholder="Ingresa tu nombre de usuario">
            </div>

            <div class="mb-3">
              <label for="email" class="form-label">Correo electrónico</label>
              <input type="email" class="form-control" id="email" placeholder="Ingresa tu correo electrónico">
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <input type="password" class="form-control" id="password" placeholder="Ingresa tu contraseña">
            </div>

            <button type="submit" class="btn btn-primary w-100">
              Registrarse
            </button>
          </form>

        </div>
      </div>

    </div>
  </div>

  <Footer />
</template>

<style scoped>

.register-image{
  height: 100%;
  width: 100%;
  background-image: url('../assets/img/register-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.formulario {
  background-color: #e8deee;
}

</style>
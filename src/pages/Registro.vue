<script setup lang="ts">
import Footer from '../components/Footer.vue'
import NavBar from '../components/NavBar.vue'
import { ref } from 'vue'
import api from '../services/api'
import { useRouter } from 'vue-router'

//router para refrigir al usuario al rolgin
const router = useRouter()

//recogemos lo que escribe el usuario
const nombre = ref('')
const email = ref('')
const password = ref('')

//recpogemos los errores si los hay
const errores = ref<Record<string, string>>({})

//avatar del usuario
const avatarFile = ref<File | null>(null)
//mostrar el avatar seleccionado
const avatarPreview = ref<string | null>(null)
//funcion para subis el avatar
const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement

  if (target.files && target.files[0]) {
    avatarFile.value = target.files[0]
    avatarPreview.value = URL.createObjectURL(target.files[0])
  }
}

const registrarUsuario = async () => {
  //array para guardar los errores
  errores.value = {}

  try {

    const formData = new FormData()

    const usuario = {
      nombre: nombre.value,
      email: email.value,
      password: password.value
    }

    formData.append(
      "usuario",
      new Blob([JSON.stringify(usuario)], { type: "application/json" })
    )

    if (avatarFile.value) {
      formData.append("avatarFile", avatarFile.value)
    }

    const response = await api.post('/usuarios', formData)

    console.log("Usuario creado", response.data)

    router.push({
      path: '/login',
      query: { registro: 'ok' }
    })

  } catch (error: any) {

    if (error.response && error.response.status === 400) {
      errores.value = error.response.data
    } else {
      console.error(error)
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
        <div class="register-image"></div>
      </div>

      <!-- Formulario derecha -->
      <div class="formulario col-md-6 d-flex align-items-center justify-content-center">
        <div class="w-75">

          <h1 class="mb-4">Registro</h1>

          <form @submit.prevent="registrarUsuario">
            <div class="mb-3">
              <label for="username" class="form-label">Nombre de usuario</label>
              <input 
              type="text"
              class="form-control"
              id="username"
              v-model="nombre"
              placeholder="Ingresa tu nombre de usuario"
              required>
              <div v-if="errores.nombre" class="text-danger">
              {{ errores.nombre }}
              </div>
            </div>

            <div class="mb-3">
              <label for="email" class="form-label">Correo electrónico</label>
              <input 
              type="email"
              class="form-control"
              id="email"
              v-model="email"
              placeholder="Ingresa tu correo electrónico"
              required>
              <div v-if="errores.email" class="text-danger">
              {{ errores.email }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Avatar (opcional)</label>
              <input
                type="file"
                class="form-control"
                accept="image/*"
                @change="onFileChange"
              />
              <small class="text-muted d-block mt-1">JPG, PNG o WEBP Máx. 2 MB. 200x200 px</small>
              <div v-if="avatarPreview" class="mt-2">
                <img :src="avatarPreview" alt="Vista previa del avatar" class="img-thumbnail" />
              </div>
              <div v-if="errores.avatarFile" class="text-danger">
                {{ errores.avatarFile }}
              </div>
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <input 
              type="password"
              class="form-control"
              id="password"
              v-model="password"
              placeholder="Ingresa tu contraseña"
              required>
              <div v-if="errores.password" class="text-danger">
              {{ errores.password }}
              </div>
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
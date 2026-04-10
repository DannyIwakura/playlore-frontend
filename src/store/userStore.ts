import { ref } from 'vue'
import { jwtDecode } from 'jwt-decode'

interface Usuario {
  id: number
  username: string
  role: string
  avatar: string
}

const usuario = ref<Usuario | null>(null)

function cargarDesdeToken() {
  const token = localStorage.getItem('token')

  if (!token) {
    usuario.value = null
    return
  }

  const payload: any = jwtDecode(token)

  usuario.value = {
    id: payload.id,
    username: payload.sub,
    role: payload.role,
    avatar: payload.avatar
  }
}

function setUsuario(newUsuario: Usuario | null) {
  usuario.value = newUsuario
}

export const userStore = {
  usuario,
  cargarDesdeToken,
  setUsuario
}
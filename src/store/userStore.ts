import { ref } from 'vue'
import { jwtDecode } from 'jwt-decode'
import api from '../services/api'

interface Usuario {
  id: number
  username: string
  role: string
  avatar: string
}

const usuario = ref<Usuario | null>(null)

async function cargarDesdeToken() {
  const token = localStorage.getItem('token')

  if (!token) {
    usuario.value = null
    return
  }

  const payload: any = jwtDecode(token)

  // Carga inicial desde el token
  usuario.value = {
    id: payload.id,
    username: payload.sub,
    role: payload.role,
    avatar: payload.avatar
  }

  // Sobreescribe con datos reales de la BD
  try {
    const res = await api.get(`/usuarios/${payload.id}`)
    usuario.value = {
      ...usuario.value,
      username: res.data.nombre,
      avatar: res.data.avatar ?? payload.avatar
    }
  } catch (_) {}
}

function setUsuario(newUsuario: Usuario | null) {
  usuario.value = newUsuario
}

export const userStore = {
  usuario,
  cargarDesdeToken,
  setUsuario
}
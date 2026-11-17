import { ref } from 'vue'
import { jwtDecode } from 'jwt-decode'
import api from '../services/api'

interface Usuario {
  id: number
  username: string
  role: string
  avatar: string
}

interface TokenPayload {
  id?: number
  sub?: string
  role?: string
  avatar?: string
}

const usuario = ref<Usuario | null>(null)

/**
 * Hidrata el usuario desde el token de forma sincrona, sin llamar al servidor.
 * Devuelve el id o null si no hay token o no se puede leer.
 */
function hidratarDesdeToken(): number | null {
  const token = localStorage.getItem('token')

  if (!token) {
    usuario.value = null
    return null
  }

  try {
    const payload = jwtDecode<TokenPayload>(token)

    if (payload.id == null) {
      usuario.value = null
      return null
    }

    // No se pisan los datos ya enriquecidos desde la BD para el mismo usuario.
    if (usuario.value?.id === payload.id) {
      return payload.id
    }

    usuario.value = {
      id: payload.id,
      username: payload.sub ?? '',
      role: payload.role ?? '',
      avatar: payload.avatar ?? '',
    }

    return payload.id
  } catch {
    usuario.value = null
    return null
  }
}

async function cargarDesdeToken() {
  const id = hidratarDesdeToken()

  if (id == null) return

  // Sobreescribe con datos reales de la BD
  try {
    const res = await api.get(`/usuarios/${id}`)
    if (usuario.value) {
      usuario.value = {
        ...usuario.value,
        username: res.data.nombre,
        avatar: res.data.avatar ?? usuario.value.avatar,
      }
    }
  } catch (_) {}
}

function setUsuario(newUsuario: Usuario | null) {
  usuario.value = newUsuario
}

export const userStore = {
  usuario,
  hidratarDesdeToken,
  cargarDesdeToken,
  setUsuario
}

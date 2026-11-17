import axios from 'axios'
import router from '../router'

const api = axios.create({
  // tomamos de base la ruta /api indicando que vamos a recibir datos en formato json usando axios
  baseURL: import.meta.env.VITE_API_URL,
})

//interceptor para añadir token a todas las peticiones (solo si no hay ya uno)
//y poner el Content-Type adecuado sin pisar los FormData
api.interceptors.request.use(config => {

  if (!config.headers.Authorization) {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  // Solo pone JSON si no hay body FormData
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }

  return config
})

/**
 * Indica si la peticion fallida viajo con un token de sesion de personaje
 * (chat) en vez de con el token del usuario. Un 401 de ese token no debe
 * cerrar la sesion del usuario.
 */
export function usaTokenDePersonaje(authHeader: unknown, tokenUsuario: string | null): boolean {
  const header = typeof authHeader === 'string' ? authHeader : ''
  return header.startsWith('Bearer ') && header !== `Bearer ${tokenUsuario}`
}

//interceptor de respuesta: si la API devuelve 401, la sesión ha caducado o el
//token es inválido → limpiamos la sesión y redirigimos al login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url: string = error.config?.url ?? ''
      const esEndpointPublico =
        url.includes('/usuarios/login') || url.includes('/usuarios/google-login')
      const tokenUsuario = localStorage.getItem('token')
      const tokenDePersonaje = usaTokenDePersonaje(
        error.config?.headers?.Authorization,
        tokenUsuario
      )

      if (!esEndpointPublico && !tokenDePersonaje) {
        localStorage.removeItem('token')
        const { userStore } = await import('../store/userStore')
        userStore.setUsuario(null)
        if (router.currentRoute.value.path !== '/login') {
          router.push('/login')
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

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

//interceptor de respuesta: si la API devuelve 401, la sesión ha caducado o el
//token es inválido → limpiamos la sesión y redirigimos al login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url: string = error.config?.url ?? ''
      const esEndpointPublico =
        url.includes('/usuarios/login') || url.includes('/usuarios/google-login')

      if (!esEndpointPublico) {
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

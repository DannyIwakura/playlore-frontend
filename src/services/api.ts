import axios from 'axios'
import router from '../router'

const api = axios.create({
  // tomamos de base la ruta /api indicando que vamos a recibir datos en formato json usando axios
  baseURL: import.meta.env.VITE_API_URL,
})

//interceptor para añadir token a todas las peticiones
api.interceptors.request.use(config => {

  const token = localStorage.getItem("token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

//interceptor para manejar errores globales
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // ✅ Solo pone JSON si no hay body FormData
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }

  return config
})

export default api
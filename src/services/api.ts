import axios from 'axios'
import router from '../router'

const api = axios.create({
  // tomamos de base la ruta /api indicando que vamos a recibir datos en formato json usando axios
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json'
  }
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
api.interceptors.response.use(
  response => response,
  error => {
    //si el token expiró o hay 401, redirigimos a login
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token'); // limpiar token
      router.push('/login'); // redirigir al login
    }
    return Promise.reject(error);
  }
)

export default api
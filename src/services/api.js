import axios from 'axios'

const api = axios.create({
  // tomamos de base la ruta /api indicando que vamos a recibir datos en formato json usando axios
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export default api
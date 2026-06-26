import api from './api'
import { characterSessionStore } from '../store/characterSessionStore'

function getAuthHeaders() {
  const token = characterSessionStore.getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const chatApi = {
  // Canales
  obtenerCanales() {
    return api.get('/canales', { headers: getAuthHeaders() })
  },

  obtenerCanalesUnidos() {
    return api.get('/canales/unidos', { headers: getAuthHeaders() })
  },

  obtenerCanalesDisponibles() {
    return api.get('/canales/disponibles', { headers: getAuthHeaders() })
  },

  obtenerCanal(id: number) {
    return api.get(`/canales/${id}`, { headers: getAuthHeaders() })
  },

  crearCanal(data: { nombre: string; descripcion?: string; privado?: boolean }) {
    return api.post('/canales', data, { headers: getAuthHeaders() })
  },

  unirseACanal(canalId: number) {
    return api.post(`/canales/${canalId}/unirse`, {}, { headers: getAuthHeaders() })
  },

  salirDeCanal(canalId: number) {
    return api.post(`/canales/${canalId}/salir`, {}, { headers: getAuthHeaders() })
  },

  invitarMiembro(canalId: number, personajeId: number) {
    return api.post(`/canales/${canalId}/invitar`, { personajeId }, { headers: getAuthHeaders() })
  },

  expulsarMiembro(canalId: number, personajeId: number) {
    return api.delete(`/canales/${canalId}/miembros/${personajeId}`, { headers: getAuthHeaders() })
  },

  cambiarRol(canalId: number, personajeId: number, rol: string) {
    return api.put(`/canales/${canalId}/miembros/${personajeId}/rol`, { rol }, { headers: getAuthHeaders() })
  },

  listarMiembros(canalId: number, page = 0, size = 10) {
    return api.get(`/canales/${canalId}/miembros`, {
      params: { page, size },
      headers: getAuthHeaders(),
    })
  },

  eliminarCanal(canalId: number) {
    return api.delete(`/canales/${canalId}`, { headers: getAuthHeaders() })
  },

  // Mensajes del canal
  obtenerMensajesCanal(canalId: number, page = 0, size = 50) {
    return api.get(`/canales/${canalId}/mensajes`, {
      params: { page, size },
      headers: getAuthHeaders(),
    })
  },

  enviarMensajeCanal(canalId: number, contenido: string) {
    return api.post(`/canales/${canalId}/mensajes`, { contenido }, { headers: getAuthHeaders() })
  },

  editarMensajeCanal(canalId: number, mensajeId: number, contenido: string) {
    return api.put(`/canales/${canalId}/mensajes/${mensajeId}`, { contenido }, { headers: getAuthHeaders() })
  },

  eliminarMensajeCanal(canalId: number, mensajeId: number) {
    return api.delete(`/canales/${canalId}/mensajes/${mensajeId}`, { headers: getAuthHeaders() })
  },

  // Mensajes privados entre personajes
  obtenerConversaciones() {
    return api.get('/chat/privado/conversaciones', { headers: getAuthHeaders() })
  },

  obtenerConversacion(otroPersonajeId: number) {
    return api.get(`/chat/privado/${otroPersonajeId}`, { headers: getAuthHeaders() })
  },

  enviarMensajePrivado(receptorId: number, contenido: string) {
    return api.post('/chat/privado', { receptorId, contenido }, { headers: getAuthHeaders() })
  },

  contarNoLeidos() {
    return api.get('/chat/privado/no-leidos', { headers: getAuthHeaders() })
  },

  cerrarTodasSesiones() {
    return api.post('/personajes/sesion/cerrar-todas')
  },

  // Presencia
  checkOnline(personajeId: number) {
    return api.get(`/personajes/${personajeId}/online`, { headers: getAuthHeaders() })
  },
}

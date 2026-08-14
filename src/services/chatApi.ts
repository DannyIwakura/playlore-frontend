import api from './api'
import { characterSessionStore } from '../store/characterSessionStore'

function getAuthHeaders() {
  const token = characterSessionStore.getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const chatApi = {
  // Canales
  obtenerCanalesUnidos() {
    return api.get('/canales/unidos', { headers: getAuthHeaders() })
  },

  obtenerCanalesDisponibles() {
    return api.get('/canales/disponibles', { headers: getAuthHeaders() })
  },

  crearCanal(data: { nombre: string; descripcion?: string; privado?: boolean }) {
    return api.post('/canales', data, { headers: getAuthHeaders() })
  },

  editarCanal(canalId: number, data: { nombre: string; descripcion?: string; privado?: boolean }) {
    return api.put(`/canales/${canalId}`, data, { headers: getAuthHeaders() })
  },

  unirseACanal(canalId: number) {
    return api.post(`/canales/${canalId}/unirse`, {}, { headers: getAuthHeaders() })
  },

  salirDeCanal(canalId: number) {
    return api.post(`/canales/${canalId}/salir`, {}, { headers: getAuthHeaders() })
  },

  expulsarMiembro(canalId: number, personajeId: number) {
    return api.delete(`/canales/${canalId}/miembros/${personajeId}`, { headers: getAuthHeaders() })
  },

  banearMiembro(canalId: number, personajeId: number, duracion: string) {
    return api.post(`/canales/${canalId}/miembros/${personajeId}/ban`, { duracion }, { headers: getAuthHeaders() })
  },

  desbanearMiembro(canalId: number, personajeId: number) {
    return api.delete(`/canales/${canalId}/miembros/${personajeId}/ban`, { headers: getAuthHeaders() })
  },

  silenciarMiembro(canalId: number, personajeId: number, duracion: string) {
    return api.post(`/canales/${canalId}/miembros/${personajeId}/silenciar`, { duracion }, { headers: getAuthHeaders() })
  },

  desilenciarMiembro(canalId: number, personajeId: number) {
    return api.delete(`/canales/${canalId}/miembros/${personajeId}/silenciar`, { headers: getAuthHeaders() })
  },

  listarBaneados(canalId: number) {
    return api.get(`/canales/${canalId}/baneados`, { headers: getAuthHeaders() })
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

  eliminarCanal(canalId: number, password: string) {
    return api.delete(`/canales/${canalId}`, { data: { password }, headers: getAuthHeaders() })
  },

  subirImagenCanal(canalId: number, file: File) {
    const formData = new FormData()
    formData.append('imagenFile', file)
    return api.put(`/canales/${canalId}/imagen`, formData, {
      headers: { ...getAuthHeaders() },
    })
  },

  eliminarImagenCanal(canalId: number) {
    return api.delete(`/canales/${canalId}/imagen`, { headers: getAuthHeaders() })
  },

  // Mensajes del canal
  obtenerMensajesCanal(canalId: number, page = 0, size = 50) {
    return api.get(`/canales/${canalId}/mensajes`, {
      params: { page, size },
      headers: getAuthHeaders(),
    })
  },

  enviarMensajeCanal(canalId: number, contenido: string, mensajePadreId?: number | null) {
    const body: Record<string, unknown> = { contenido }
    if (mensajePadreId != null) body.mensajePadreId = mensajePadreId
    return api.post(`/canales/${canalId}/mensajes`, body, { headers: getAuthHeaders() })
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

  eliminarConversacion(otroPersonajeId: number) {
    return api.delete(`/chat/privado/conversaciones/${otroPersonajeId}`, { headers: getAuthHeaders() })
  },

  // Presencia
  actualizarStatus(personajeId: number, status: string) {
    return api.put(`/personajes/${personajeId}/status`, { status }, { headers: getAuthHeaders() })
  },
}

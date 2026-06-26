import { ref, computed } from 'vue'
import api from '../services/api'

interface PersonajeSesion {
  idSesion: number
  personajeId: number
  personajeNombre: string
  personajeAvatar: string
  usuarioId: number
  tokenJwt: string
  fechaInicio: string
  ultimaActividad: string
}

const MAX_SESIONES = 5

const sesiones = ref<PersonajeSesion[]>([])
const sesionActualIdx = ref(0)
const cargando = ref(false)

const sesionActual = computed(() => sesiones.value[sesionActualIdx.value] ?? null)

function getToken(): string | null {
  return sesionActual.value?.tokenJwt ?? null
}

async function iniciarSesion(personajeId: number): Promise<PersonajeSesion> {
  cargando.value = true
  try {
    const { data } = await api.post('/personajes/sesion/iniciar', { personajeId })
    sesiones.value.push(data)
    sesionActualIdx.value = sesiones.value.length - 1
    return data
  } finally {
    cargando.value = false
  }
}

async function cerrarSesionActual() {
  const sesion = sesionActual.value
  if (!sesion) return
  try {
    await api.post('/personajes/sesion/cerrar', {}, {
      headers: { Authorization: `Bearer ${sesion.tokenJwt}` }
    })
  } catch {}
  const idx = sesiones.value.findIndex(s => s.tokenJwt === sesion.tokenJwt)
  if (idx >= 0) sesiones.value.splice(idx, 1)
  if (sesionActualIdx.value >= sesiones.value.length) {
    sesionActualIdx.value = Math.max(0, sesiones.value.length - 1)
  }
}

async function cerrarSesion(sesion: PersonajeSesion) {
  try {
    await api.post('/personajes/sesion/cerrar', {}, {
      headers: { Authorization: `Bearer ${sesion.tokenJwt}` }
    })
  } catch {}
  const idx = sesiones.value.findIndex(s => s.tokenJwt === sesion.tokenJwt)
  if (idx >= 0) sesiones.value.splice(idx, 1)
  if (sesionActualIdx.value >= sesiones.value.length) {
    sesionActualIdx.value = Math.max(0, sesiones.value.length - 1)
  }
}

async function cerrarTodas() {
  for (const s of [...sesiones.value]) {
    await cerrarSesion(s)
  }
}

async function obtenerSesionesActivas(): Promise<PersonajeSesion[]> {
  try {
    const { data } = await api.get<PersonajeSesion[]>('/personajes/sesion/activas')
    if (data.length > 0) {
      sesiones.value = data
      sesionActualIdx.value = 0
    }
    return data
  } catch {
    return []
  }
}

function seleccionarSesion(index: number) {
  if (index >= 0 && index < sesiones.value.length) {
    sesionActualIdx.value = index
  }
}

export const characterSessionStore = {
  sesiones,
  sesionActual,
  sesionActualIdx,
  cargando,
  getToken,
  iniciarSesion,
  cerrarSesionActual,
  cerrarSesion,
  cerrarTodas,
  obtenerSesionesActivas,
  seleccionarSesion,
  MAX_SESIONES,
}

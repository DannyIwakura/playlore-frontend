<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'

const BASE_URL = 'http://localhost:8080/api'

const route = useRoute()
const router = useRouter()

// --- Tipos ---
interface PerfilPersonajeDTO {
  idPersonaje: number
  nombre: string
  edadPersonaje: number | null
  genero: string
  avatar: string
  trasfondo: string
  raza: string
  clase: string
  fechaCreacion: string
  fechaModificacion: string
  estadoPersonaje?: 'ACTIVO' | 'INACTIVO' | 'DESACTIVADO'
  userId: number
}

interface UsuarioDTO {
  userId: number
  nombre: string
  email: string
  avatar: string
  ultimaConexion: string | null
}

interface CategoriaDTO {
  idCategoria: number
  nombre: string
  color?: string
  descripcion?: string
}

// --- Estado ---
const personaje = ref<PerfilPersonajeDTO | null>(null)
const usuario = ref<UsuarioDTO | null>(null)
const categorias = ref<CategoriaDTO[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)

const modalMensaje = ref(false)
const mensaje = ref({ titulo: '', contenido: '' })
const enviandoMensaje = ref(false)

const miId = computed(() => userStore.usuario.value?.id)
const esMiPersonaje = computed(() => personaje.value?.userId === miId.value)
const puedeModerarPersonaje = computed(() => {
  const rol = userStore.usuario.value?.role
  return rol === 'ADMIN' || rol === 'MOD'
})

async function cambiarEstadoPersonaje(nuevoEstado: 'ACTIVO' | 'DESACTIVADO') {
  if (!personaje.value) return
  try {
    await api.put(`/personajes/admin/${personaje.value.idPersonaje}/estado`, {
      estado: nuevoEstado
    })
    personaje.value = { ...personaje.value, estadoPersonaje: nuevoEstado }
    alert(`Personaje ${nuevoEstado === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente.`)
  } catch {
    alert('Error al cambiar el estado del personaje.')
  }
}

// --- Helpers ---
function avatarPersonajeUrl(avatar: string | null | undefined): string {
  if (!avatar) return `${BASE_URL}/images/AVATAR.png`
  if (avatar.startsWith('http')) return avatar
  return BASE_URL + avatar
}

function avatarUsuarioUrl(avatar: string | null | undefined): string {
  if (!avatar) return `${BASE_URL}/images/AVATAR.png`
  if (avatar.startsWith('http')) return avatar
  return BASE_URL + avatar
}

function tiempoDesdeConexion(fecha: string | null | undefined): string {
  if (!fecha) return 'Nunca conectado'
  const ahora = new Date()
  const entonces = new Date(fecha)
  const diffMs = ahora.getTime() - entonces.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 2) return 'Conectado ahora'
  if (diffMin < 60) return `Hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`
  if (diffH < 24) return `Hace ${diffH} hora${diffH !== 1 ? 's' : ''}`
  if (diffD === 1) return 'Hace 1 día'
  if (diffD < 30) return `Hace ${diffD} días`
  const diffM = Math.floor(diffD / 30)
  return `Hace ${diffM} mes${diffM !== 1 ? 'es' : ''}`
}

function formatFecha(fecha: string): string {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

// --- Carga de datos ---
async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const id = route.params.id
    const { data } = await api.get<PerfilPersonajeDTO>(`/personajes/${id}`)
    personaje.value = data

    // Cargar usuario propietario
    const { data: usu } = await api.get<UsuarioDTO>(`/usuarios/${data.userId}`)
    usuario.value = usu

    // Cargar categorías del personaje
    try {
        const { data: cats } = await api.get<any[]>(`/personaje-categorias/personaje/${id}`)
        categorias.value = cats.map(pc => ({
          idCategoria: pc.idCategoria,
          nombre: pc.nombreCategoria,
          descripcion: pc.descripcionCategoria ?? ''
        }))
    } catch {
        categorias.value = []
    }
  } catch (e: any) {
    if (e.response?.status === 404) {
      error.value = 'Personaje no encontrado.'
    } else {
      error.value = 'Error al cargar el perfil del personaje.'
    }
  } finally {
    cargando.value = false
  }
}

function irAlPerfil() {
  if (usuario.value) router.push(`/perfil/${usuario.value.userId}`)
}

async function enviarMensaje() {
    console.log("Payload:", {
    emisorId: miId.value,
    receptorId: usuario.value?.userId,
    titulo: mensaje.value.titulo,
    contenido: mensaje.value.contenido
    });
    const emisor = miId.value
    if (!emisor || !usuario.value) return
    enviandoMensaje.value = true
    try {
        await api.post('/mensajes/enviar', {
        emisorId: emisor,
        receptorId: usuario.value.userId,
        titulo: mensaje.value.titulo,
        contenido: mensaje.value.contenido
        })
        modalMensaje.value = false
        mensaje.value = { titulo: '', contenido: '' }
    } catch {
        alert('Error al enviar el mensaje.')
    } finally {
        enviandoMensaje.value = false
    }
}

async function enviarAmistad() {
  if (!usuario.value) return
  const emisor = miId.value
  if (!emisor) return
  try {
    await api.post('/amistades', {
      emisorId: emisor,
      receptorId: usuario.value.userId
    })
    alert('Solicitud de amistad enviada.')
  } catch (e: any) {
    if (e.response?.status === 409) alert('Ya existe una solicitud pendiente o ya sois amigos.')
    else alert('No se pudo enviar la solicitud.')
  }
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  cargar()
})
</script>

<template>
  <NavBar :logeado="true" />

  <!-- CARGANDO -->
  <div v-if="cargando" class="d-flex justify-content-center align-items-center" style="min-height:60vh">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Cargando...</span>
    </div>
  </div>

  <!-- ERROR -->
  <div v-else-if="error" class="container mt-5">
    <div class="alert alert-danger">{{ error }}</div>
  </div>

  <!-- PERFIL DESACTIVADO (usuarios sin permisos) -->
  <div v-else-if="personaje?.estadoPersonaje === 'DESACTIVADO' && !puedeModerarPersonaje"
    class="container mt-5">
    <div class="alert alert-warning d-flex align-items-center gap-3">
      <i class="bi bi-slash-circle fs-4"></i>
      <div>
        <strong>Perfil desactivado</strong><br>
        Este perfil ha sido desactivado por no cumplir las normas de contenido.
      </div>
    </div>
  </div>

  <!-- CONTENIDO -->
  <main v-else-if="personaje" class="perfil-personaje-bg py-5">
    <div class="container">
      <div class="row g-4">

        <!-- ===================== COLUMNA IZQUIERDA ===================== -->
        <div class="col-12 col-lg-4">
          <div class="perfil-card shadow-sm h-100 d-flex flex-column gap-3">

            <!-- Avatar del personaje -->
            <div class="text-center">
              <img
                :src="avatarPersonajeUrl(personaje.avatar)"
                :alt="`Avatar de ${personaje.nombre}`"
                class="avatar-personaje"
              />
            </div>

            <!-- Nombre y estado -->
            <div class="text-center">
              <h2 class="personaje-nombre mb-0">{{ personaje.nombre }}</h2>
              <span class="badge-clase mt-1 d-inline-block">{{ personaje.clase || 'Sin clase' }}</span>
            </div>

            <hr class="divider" />

            <!-- Datos principales -->
            <ul class="datos-lista">
              <li v-if="personaje.raza">
                <span class="dato-icono">🧬</span>
                <div><span class="dato-label">Raza</span><span class="dato-val">{{ personaje.raza }}</span></div>
              </li>
              <li v-if="personaje.genero">
                <span class="dato-icono">⚧</span>
                <div><span class="dato-label">Género</span><span class="dato-val">{{ personaje.genero }}</span></div>
              </li>
              <li v-if="personaje.edadPersonaje != null">
                <span class="dato-icono">🎂</span>
                <div><span class="dato-label">Edad</span><span class="dato-val">{{ personaje.edadPersonaje }} años</span></div>
              </li>
              <li>
                <span class="dato-icono">📅</span>
                <div>
                  <span class="dato-label">Creado</span>
                  <span class="dato-val">{{ formatFecha(personaje.fechaCreacion) }}</span>
                </div>
              </li>
            </ul>

            <hr class="divider" />

            <!-- Bloque usuario propietario -->
            <div v-if="usuario" class="usuario-bloque">
              <p class="dato-label mb-2">Personaje de</p>
              <div class="d-flex align-items-center gap-3">
                <img
                  :src="avatarUsuarioUrl(usuario.avatar)"
                  :alt="`Avatar de ${usuario.nombre}`"
                  class="avatar-usuario"
                />
                <div>
                  <p class="usuario-nombre mb-0">{{ usuario.nombre }}</p>
                  <p class="ultima-conexion mb-0">
                    <i class="bi bi-circle-fill me-1" :class="{'text-success': !usuario.ultimaConexion || (new Date().getTime() - new Date(usuario.ultimaConexion).getTime()) < 300000, 'text-secondary': usuario.ultimaConexion && (new Date().getTime() - new Date(usuario.ultimaConexion).getTime()) >= 300000}"></i>
                    {{ tiempoDesdeConexion(usuario.ultimaConexion) }}
                  </p>
                </div>
              </div>

              <!-- Botones de acción -->
              <div v-if="!esMiPersonaje" class="d-flex flex-column gap-2 mt-3">
                <button class="btn-accion btn-accion--primary" @click="irAlPerfil">
                  <i class="bi bi-person-fill me-2"></i>Ver perfil
                </button>
                <button class="btn-accion btn-accion--outline" @click="modalMensaje = true">
                  <i class="bi bi-envelope-fill me-2"></i>Enviar mensaje
                </button>
                <template v-if="puedeModerarPersonaje">
                    <div
                      v-if="personaje.estadoPersonaje === 'DESACTIVADO'"
                      class="alerta-desactivado mb-2"
                    >
                      <i class="bi bi-slash-circle me-2"></i>
                      Perfil desactivado · Solo visible para moderadores
                    </div>
                  <button
                    v-if="personaje.estadoPersonaje !== 'DESACTIVADO'"
                    class="btn-accion btn-accion--danger"
                    @click="cambiarEstadoPersonaje('DESACTIVADO')">
                    <i class="bi bi-slash-circle me-2"></i>Desactivar perfil
                  </button>
                  <button
                    v-else
                    class="btn-accion btn-accion--success"
                    @click="cambiarEstadoPersonaje('ACTIVO')">
                    <i class="bi bi-check-circle me-2"></i>Activar perfil
                  </button>
                </template>
                <button class="btn-accion btn-accion--ghost" @click="enviarAmistad">
                  <i class="bi bi-person-plus-fill me-2"></i>Petición de amistad
                </button>
              </div>

              <!-- Si es mi personaje, botón de edición -->
              <div v-else class="mt-3">
                <router-link
                  :to="`/personajes/editar/${personaje.idPersonaje}`"
                  class="btn-accion btn-accion--primary d-block text-center text-decoration-none"
                >
                  <i class="bi bi-pencil-fill me-2"></i>Editar personaje
                </router-link>
              </div>
            </div>

          </div>
        </div>

        <!-- ===================== COLUMNA DERECHA ===================== -->
        <div class="col-12 col-lg-8 d-flex flex-column gap-4">

          <!-- Trasfondo -->
          <div class="perfil-card shadow-sm">
            <div class="d-flex align-items-center gap-2 mb-3">
              <span class="seccion-icono">📖</span>
              <h3 class="seccion-titulo mb-0">Trasfondo</h3>
            </div>

            <div
              v-if="personaje.trasfondo"
              class="trasfondo-contenido"
              v-html="personaje.trasfondo"
            ></div>
            <p v-else class="text-muted fst-italic">Este personaje aún no tiene trasfondo escrito.</p>
          </div>

          <!-- Categorías -->
          <div class="perfil-card shadow-sm">
            <div class="d-flex align-items-center gap-2 mb-3">
              <span class="seccion-icono">🏷️</span>
              <h3 class="seccion-titulo mb-0">Categorías</h3>
            </div>

            <div v-if="categorias.length > 0" class="d-flex flex-wrap gap-2">
              <span
                v-for="cat in categorias"
                :key="cat.idCategoria"
                class="categoria-badge"
                :class="{ 'has-tooltip': cat.descripcion }"
                :style="cat.color ? { backgroundColor: cat.color + '22', borderColor: cat.color, color: cat.color } : {}"
                :data-tooltip="cat.descripcion || ''"
              >
                {{ cat.nombre }}
              </span>
            </div>
            <p v-else class="text-muted fst-italic mb-0">Sin categorías asignadas.</p>
          </div>

        </div>
      </div>
    </div>
  </main>
  <!-- Modal de mensqaje -->
   <div v-if="modalMensaje" class="modal-backdrop-custom" @click.self="modalMensaje = false">
  <div class="modal-dialog-custom shadow-lg rounded-3 p-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">Nuevo mensaje</h5>
      <button class="btn-close" @click="modalMensaje = false"></button>
    </div>
    <div class="mb-3">
        <label class="form-label">Destinatario</label>
        <input :value="usuario?.nombre" type="text" class="form-control" disabled />
    </div>
    <div class="mb-3">
      <label class="form-label">Asunto</label>
      <input v-model="mensaje.titulo" type="text" class="form-control" maxlength="150" placeholder="Asunto del mensaje" />
    </div>
    <div class="mb-4">
      <label class="form-label">Mensaje</label>
      <textarea v-model="mensaje.contenido" class="form-control" rows="5" maxlength="2000"></textarea>
      <div class="text-end text-muted small mt-1">{{ mensaje.contenido.length }}/2000</div>
    </div>
    <div class="d-flex justify-content-end gap-2">
      <button class="btn btn-outline-secondary" @click="modalMensaje = false">Cancelar</button>
      <button
        class="btn btn-primary"
        :disabled="enviandoMensaje || !mensaje.contenido"
        @click="enviarMensaje"
      >
        <span v-if="enviandoMensaje" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-send me-1"></i>
        Enviar
      </button>
        </div>
    </div>
    </div>
  <Footer />
</template>

<style scoped>
/* ---- Fondo general ---- */
.perfil-personaje-bg {
  min-height: 80vh;
  background: linear-gradient(135deg, #f0f4ff 0%, #fafafa 60%, #f5f0ff 100%);
}

/* ---- Tarjeta base ---- */
.perfil-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.75rem;
  border: 1px solid #e8eaf0;
}

/* ---- Avatar personaje ---- */
.avatar-personaje {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: 50%;
  border: 4px solid #e0e7ff;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
}

/* ---- Nombre ---- */
.personaje-nombre {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e1b4b;
  letter-spacing: -0.02em;
}

/* ---- Badge de clase ---- */
.badge-clase {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3em 0.9em;
  border-radius: 99px;
  background: #ede9fe;
  color: #6d28d9;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ---- Divider ---- */
.divider {
  border-color: #e8eaf0;
  margin: 0;
}

/* ---- Lista de datos ---- */
.datos-lista {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.datos-lista li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dato-icono {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.dato-label {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  font-weight: 600;
}

.dato-val {
  display: block;
  font-size: 0.93rem;
  color: #374151;
  font-weight: 500;
}

/* ---- Usuario propietario ---- */
.usuario-bloque {
  /* contenedor del bloque usuario */
}

.avatar-usuario {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e7ff;
}

.usuario-nombre {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1e1b4b;
}

.ultima-conexion {
  font-size: 0.78rem;
  color: #9ca3af;
}

/* ---- Botones de acción ---- */
.btn-accion {
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  border: 2px solid transparent;
  text-align: center;
}

.btn-accion--primary {
  background: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
}
.btn-accion--primary:hover {
  background: #4338ca;
  border-color: #4338ca;
}

.btn-accion--outline {
  background: transparent;
  color: #4f46e5;
  border-color: #4f46e5;
}
.btn-accion--outline:hover {
  background: #eef2ff;
}

.btn-accion--ghost {
  background: transparent;
  color: #6b7280;
  border-color: #d1d5db;
}
.btn-accion--ghost:hover {
  background: #f3f4f6;
  color: #374151;
}

/* ---- Secciones derecha ---- */
.seccion-icono {
  font-size: 1.3rem;
}

.seccion-titulo {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e1b4b;
}

/* ---- Trasfondo HTML ---- */
.trasfondo-contenido {
  line-height: 1.8;
  font-size: 0.95rem;
  color: #374151;
  word-break: break-word;
}

/* Estilos para el HTML del trasfondo */
.trasfondo-contenido :deep(h1),
.trasfondo-contenido :deep(h2),
.trasfondo-contenido :deep(h3) {
  color: #1e1b4b;
  margin-top: 1rem;
}

.trasfondo-contenido :deep(strong) {
  color: #111827;
}

.trasfondo-contenido :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 0.5rem 0;
}

.trasfondo-contenido :deep(blockquote) {
  border-left: 3px solid #6d28d9;
  padding-left: 1rem;
  color: #6b7280;
  font-style: italic;
  margin: 1rem 0;
}

/* ---- Badges de categoría ---- */
.categoria-badge {
  display: inline-block;
  padding: 0.35em 0.85em;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #f3f4f6;
  border: 1.5px solid #d1d5db;
  color: #374151;
  letter-spacing: 0.02em;
}

/* ---- Estilos para el modal de mensaje ---- */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-dialog-custom {
  background: #fff;
  width: 100%;
  max-width: 520px;
  margin: 1rem;
}

.btn-accion--danger {
  background: transparent;
  color: #dc2626;
  border-color: #dc2626;
}

.btn-accion--danger:hover {
  background: #fef2f2;
}

.btn-accion--success {
  background: transparent;
  color: #16a34a;
  border-color: #16a34a;
}

.btn-accion--success:hover {
  background: #f0fdf4;

}

.alerta-desactivado {
  font-size: 0.78rem;
  font-weight: 600;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  text-align: center;
}

/* ---- Tooltip CSS en categorías ---- */
.categoria-badge.has-tooltip {
  position: relative;
  cursor: default;
}

.categoria-badge.has-tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1e1b4b;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 400;
  padding: 0.4em 0.75em;
  border-radius: 6px;
  white-space: nowrap;
  max-width: 220px;
  white-space: normal;
  text-align: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease;
  z-index: 100;
  line-height: 1.4;
}

.categoria-badge.has-tooltip::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #1e1b4b;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease;
  z-index: 100;
}

.categoria-badge.has-tooltip:hover::after,
.categoria-badge.has-tooltip:hover::before {
  opacity: 1;
}
</style>
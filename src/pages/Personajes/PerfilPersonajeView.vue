<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import GaleriaImagenes from '../../components/GaleriaImagenes.vue'
import ModalAviso from '../../components/ModalAviso.vue'
import ModalConfirmacion from '../../components/ModalConfirmacion.vue'
import ModalFormulario from '../../components/ModalFormulario.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'
import { indicePestanaParaTecla } from '../../composables/usePestanas'
import { enfocarPrimerError } from '../../composables/useFocoPrimerError'
import defaultAvatar from '../../assets/img/AVATAR.png'

const BASE_URL = import.meta.env.VITE_API_URL

const props = defineProps<{
  personajeId?: number
  modoModal?: boolean
}>()

const emit = defineEmits<{
  cerrar: []
}>()

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
  descripcion?: string
}

// --- Estado ---
const personaje = ref<PerfilPersonajeDTO | null>(null)
const usuario = ref<UsuarioDTO | null>(null)
const categorias = ref<CategoriaDTO[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const noEncontrado = ref(false)

const aviso = ref<string | null>(null)

const PESTANAS = [
  { id: 'trasfondo', etiqueta: 'Trasfondo', icono: 'bi-book' },
  { id: 'categorias', etiqueta: 'Categorías', icono: 'bi-tags' },
  { id: 'galeria', etiqueta: 'Galería', icono: 'bi-images' },
] as const

type Pestana = (typeof PESTANAS)[number]['id']

const tabActiva = ref<Pestana>('trasfondo')
const tablistRef = ref<HTMLElement | null>(null)

const miId = computed(() => userStore.usuario.value?.id)
const esMiPersonaje = computed(() => personaje.value?.userId === miId.value)
const puedeModerarPersonaje = computed(() => {
  const rol = userStore.usuario.value?.role
  return rol === 'ADMIN' || rol === 'MOD'
})

const estaDesactivado = computed(() => personaje.value?.estadoPersonaje === 'DESACTIVADO')
const bloqueadoParaMi = computed(() => estaDesactivado.value && !puedeModerarPersonaje.value)

const conectadoAhora = computed(() => {
  const fecha = usuario.value?.ultimaConexion
  if (!fecha) return false
  return Date.now() - new Date(fecha).getTime() < 300000
})

// --- Helpers ---
function avatarPersonajeUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return defaultAvatar
  if (avatar.startsWith('http')) return avatar
  return BASE_URL + avatar
}

function avatarUsuarioUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return defaultAvatar
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

// El backend no envia color por categoria: el punto es decorativo y estable.
const COLORES_CATEGORIA = [
  'var(--pl-primary)',
  'var(--pl-cyan)',
  'var(--pl-success)',
  'var(--pl-warning)',
  'var(--pl-info)',
  'var(--pl-danger)',
]

function colorCategoria(categoria: CategoriaDTO): string {
  const indice = Math.abs(categoria.idCategoria) % COLORES_CATEGORIA.length
  return COLORES_CATEGORIA[indice]
}

// --- Carga de datos ---
async function cargar() {
  cargando.value = true
  error.value = null
  noEncontrado.value = false
  personaje.value = null
  usuario.value = null
  categorias.value = []
  tabActiva.value = 'trasfondo'

  const id = props.personajeId ?? Number(route.params.id)

  if (!Number.isFinite(id) || id <= 0) {
    noEncontrado.value = true
    cargando.value = false
    return
  }

  try {
    const { data } = await api.get<PerfilPersonajeDTO>(`/personajes/${id}`)
    personaje.value = data

    // El propietario y las categorias son informativos: si fallan, el perfil sigue visible.
    try {
      const { data: usu } = await api.get<UsuarioDTO>(`/usuarios/${data.userId}`)
      usuario.value = usu
    } catch {
      usuario.value = null
    }

    try {
      const { data: cats } = await api.get<any[]>(`/personaje-categorias/personaje/${id}`)
      categorias.value = (cats ?? []).map((pc) => ({
        idCategoria: pc.idCategoria,
        nombre: pc.nombreCategoria,
        descripcion: pc.descripcionCategoria ?? '',
      }))
    } catch {
      categorias.value = []
    }
  } catch (e: any) {
    if (e?.response?.status === 404) {
      noEncontrado.value = true
    } else {
      error.value = 'No pudimos cargar el perfil del personaje. Revisa tu conexión e inténtalo de nuevo.'
    }
  } finally {
    cargando.value = false
  }
}

// --- Pestanas (patron ARIA) ---
function onTeclaPestana(event: KeyboardEvent, indice: number) {
  const nuevo = indicePestanaParaTecla(event.key, indice, PESTANAS.length)
  if (nuevo === null) return

  event.preventDefault()
  tabActiva.value = PESTANAS[nuevo].id
  nextTick(() => {
    tablistRef.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nuevo]?.focus()
  })
}

// --- Acciones ---
function irAlPerfil() {
  if (usuario.value) router.push(`/perfil/${usuario.value.userId}`)
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
    aviso.value = 'Solicitud de amistad enviada.'
  } catch (e: any) {
    if (e.response?.status === 409) aviso.value = 'Ya existe una solicitud pendiente o ya sois amigos.'
    else aviso.value = 'No se pudo enviar la solicitud.'
  }
}

// --- Cambio de estado (moderacion) ---
const confirmacionDesactivar = ref(false)
const cambiandoEstado = ref(false)

async function aplicarEstado(nuevoEstado: 'ACTIVO' | 'DESACTIVADO') {
  if (!personaje.value || cambiandoEstado.value) return
  cambiandoEstado.value = true
  try {
    await api.put(`/personajes/admin/${personaje.value.idPersonaje}/estado`, {
      estado: nuevoEstado
    })
    personaje.value = { ...personaje.value, estadoPersonaje: nuevoEstado }
    aviso.value = `Personaje ${nuevoEstado === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente.`
  } catch {
    aviso.value = 'No pudimos cambiar el estado del personaje. Inténtalo de nuevo.'
  } finally {
    cambiandoEstado.value = false
    confirmacionDesactivar.value = false
  }
}

function solicitarDesactivar() {
  if (estaDesactivado.value) {
    void aplicarEstado('ACTIVO')
    return
  }
  confirmacionDesactivar.value = true
}

// --- Denunciar personaje ---
const modalDenuncia = ref(false)
const denuncia = ref({ motivo: '', detalle: '' })
const erroresDenuncia = reactive<Record<string, string>>({})
const enviandoDenuncia = ref(false)
const formDenuncia = ref<HTMLFormElement | null>(null)

function limpiarErroresDenuncia() {
  Object.keys(erroresDenuncia).forEach((clave) => delete erroresDenuncia[clave])
}

function abrirDenuncia() {
  denuncia.value = { motivo: '', detalle: '' }
  limpiarErroresDenuncia()
  modalDenuncia.value = true
}

function onMotivoEditado() {
  delete erroresDenuncia.motivo
  delete erroresDenuncia.general
}

function cerrarDenuncia() {
  modalDenuncia.value = false
  limpiarErroresDenuncia()
}

async function enviarDenuncia() {
  if (!personaje.value) return
  limpiarErroresDenuncia()

  if (!denuncia.value.motivo.trim()) {
    erroresDenuncia.motivo = 'El motivo es obligatorio para enviar la denuncia.'
    await enfocarPrimerError(formDenuncia.value)
    return
  }

  enviandoDenuncia.value = true
  try {
    await api.post('/denuncias', {
      tipo: 'PERSONAJE',
      tipoId: personaje.value.idPersonaje,
      motivo: denuncia.value.motivo.trim(),
      detalle: denuncia.value.detalle.trim() || null,
    })
    cerrarDenuncia()
    aviso.value = 'Denuncia enviada. Gracias por ayudar a mantener la comunidad segura.'
  } catch (e: any) {
    const data = e?.response?.data
    erroresDenuncia.general = data?.error || data?.message || data?.mensaje || 'Error al enviar la denuncia.'
  } finally {
    enviandoDenuncia.value = false
  }
}

// --- Banear personaje (solo ADMIN/MOD) ---
const modalBaneo = ref(false)
const baneo = ref({ duracion: 'PERMANENTE', motivo: '' })
const errorBaneo = ref('')
const baneando = ref(false)

const opcionesDuracion = [
  { value: '1H', label: '1 hora' },
  { value: '24H', label: '24 horas' },
  { value: '7D', label: '7 días' },
  { value: 'PERMANENTE', label: 'Permanente' },
]

function abrirBaneo() {
  baneo.value = { duracion: 'PERMANENTE', motivo: '' }
  errorBaneo.value = ''
  modalBaneo.value = true
}

function cerrarBaneo() {
  modalBaneo.value = false
  errorBaneo.value = ''
}

async function banearPersonaje() {
  if (!personaje.value) return
  const dur = baneo.value.duracion
  errorBaneo.value = ''
  baneando.value = true
  try {
    await api.post('/moderacion/baneos', {
      tipo: 'PERSONAJE',
      id: personaje.value.idPersonaje,
      duracion: baneo.value.duracion,
      motivo: baneo.value.motivo.trim() || null,
    })
    cerrarBaneo()
    aviso.value = `Personaje baneado${dur !== 'PERMANENTE' ? ' temporalmente' : ''}.`
  } catch (e: any) {
    const data = e?.response?.data
    errorBaneo.value = data?.error || data?.message || data?.mensaje || 'Error al banear al personaje.'
  } finally {
    baneando.value = false
  }
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  await cargar()
})

watch(
  () => props.personajeId ?? route.params.id,
  (nuevo, anterior) => {
    if (nuevo && nuevo !== anterior) void cargar()
  }
)
</script>

<template>
  <NavBar v-if="!modoModal" :logeado="true" />

  <div v-if="modoModal" class="perfil-modal-cabecera">
    <h2 class="pl-modal-title mb-0">Perfil del personaje</h2>
    <button type="button" class="btn-close" aria-label="Cerrar perfil" @click="emit('cerrar')"></button>
  </div>

  <div :class="{ 'perfil-modal-scroll': modoModal }">
    <!-- Carga -->
    <div v-if="cargando" class="container perfil-contenedor">
      <p class="visually-hidden" role="status">Cargando el perfil del personaje…</p>
      <div class="perfil-layout" aria-hidden="true">
        <div class="perfil-esqueleto perfil-esqueleto--lateral"></div>
        <div class="perfil-esqueleto perfil-esqueleto--contenido"></div>
      </div>
    </div>

    <!-- No encontrado -->
    <main v-else-if="noEncontrado" :class="modoModal ? 'perfil-modal-pagina' : 'pl-page'">
      <div class="container perfil-contenedor">
        <div class="pl-empty-state">
          <span class="pl-empty-state__icon" aria-hidden="true">
            <i class="bi bi-person-x"></i>
          </span>
          <h1 class="perfil-vacio__titulo">Personaje no encontrado</h1>
          <p>Puede que se haya eliminado o que el enlace esté mal.</p>
          <button
            v-if="modoModal"
            type="button"
            class="pl-btn pl-btn--secondary"
            @click="emit('cerrar')"
          >
            Cerrar
          </button>
          <router-link v-else to="/personajes" class="pl-btn pl-btn--primary">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Volver a mis personajes
          </router-link>
        </div>
      </div>
    </main>

    <!-- Error de red -->
    <main v-else-if="error" :class="modoModal ? 'perfil-modal-pagina' : 'pl-page'">
      <div class="container perfil-contenedor">
        <div class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span class="flex-grow-1">{{ error }}</span>
          <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="cargar()">
            Reintentar
          </button>
        </div>
      </div>
    </main>

    <!-- Perfil desactivado y el visitante no modera -->
    <main v-else-if="bloqueadoParaMi" :class="modoModal ? 'perfil-modal-pagina' : 'pl-page'">
      <div class="container perfil-contenedor">
        <div class="pl-alert pl-alert--warning" role="alert">
          <i class="bi bi-slash-circle" aria-hidden="true"></i>
          <div>
            <strong>Perfil desactivado</strong>
            <p class="mb-0">Este perfil ha sido desactivado por no cumplir las normas de contenido.</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Perfil -->
    <main v-else-if="personaje" :class="modoModal ? 'perfil-modal-pagina' : 'pl-page'">
      <div class="container perfil-contenedor">
        <div v-if="!modoModal" class="pl-toolbar perfil-toolbar">
          <router-link to="/personajes" class="pl-btn pl-btn--ghost pl-btn--sm">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Mis personajes
          </router-link>
          <router-link to="/personajes/buscar" class="pl-btn pl-btn--ghost pl-btn--sm">
            Buscar personajes
            <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </router-link>
        </div>

        <div v-if="estaDesactivado" class="pl-alert pl-alert--warning" role="status">
          <i class="bi bi-slash-circle" aria-hidden="true"></i>
          <span>Perfil desactivado · Solo visible para moderadores.</span>
        </div>

        <div class="perfil-layout">
          <!-- Columna lateral -->
          <aside class="pl-card perfil-lateral" aria-label="Datos del personaje">
            <img
              class="perfil-media"
              :src="avatarPersonajeUrl(personaje.avatar)"
              :alt="`Avatar de ${personaje.nombre}`"
              width="640"
              height="640"
            />

            <div class="perfil-lateral__cuerpo">
              <div>
                <h1 class="perfil-nombre">{{ personaje.nombre }}</h1>
                <div class="perfil-pildoras">
                  <span class="pl-status-pill pl-status-pill--neutral">
                    <i class="bi bi-shield" aria-hidden="true"></i>
                    {{ personaje.clase || 'Sin clase' }}
                  </span>
                  <span
                    v-if="estaDesactivado"
                    class="pl-status-pill pl-status-pill--danger"
                  >
                    <i class="bi bi-slash-circle" aria-hidden="true"></i>
                    Desactivado
                  </span>
                </div>
              </div>

              <dl class="perfil-datos">
                <div v-if="personaje.raza" class="perfil-dato">
                  <dt><i class="bi bi-stars" aria-hidden="true"></i>Raza</dt>
                  <dd>{{ personaje.raza }}</dd>
                </div>
                <div v-if="personaje.genero" class="perfil-dato">
                  <dt><i class="bi bi-gender-ambiguous" aria-hidden="true"></i>Género</dt>
                  <dd>{{ personaje.genero }}</dd>
                </div>
                <div v-if="personaje.edadPersonaje != null" class="perfil-dato">
                  <dt><i class="bi bi-hourglass-split" aria-hidden="true"></i>Edad</dt>
                  <dd>{{ personaje.edadPersonaje }} años</dd>
                </div>
                <div class="perfil-dato">
                  <dt><i class="bi bi-calendar3" aria-hidden="true"></i>Creado</dt>
                  <dd>{{ formatFecha(personaje.fechaCreacion) }}</dd>
                </div>
              </dl>

              <div v-if="usuario" class="perfil-propietario">
                <p class="perfil-etiqueta">Personaje de</p>
                <div class="perfil-propietario__fila">
                  <img
                    :src="avatarUsuarioUrl(usuario.avatar)"
                    :alt="`Avatar de ${usuario.nombre}`"
                    class="pl-avatar perfil-propietario__avatar"
                    width="44"
                    height="44"
                  />
                  <div class="perfil-propietario__info">
                    <p class="perfil-propietario__nombre">{{ usuario.nombre }}</p>
                    <p class="perfil-propietario__estado">
                      <span
                        class="perfil-punto"
                        :class="{ 'perfil-punto--online': conectadoAhora }"
                        aria-hidden="true"
                      ></span>
                      {{ tiempoDesdeConexion(usuario.ultimaConexion) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Las acciones no dependen de que cargue el propietario: si su
                   peticion falla, denunciar y moderar deben seguir disponibles. -->
              <div class="perfil-acciones" :class="{ 'perfil-acciones--suelta': !usuario }">
                <template v-if="!esMiPersonaje">
                  <button
                    v-if="usuario"
                    type="button"
                    class="pl-btn pl-btn--primary"
                    @click="irAlPerfil"
                  >
                    <i class="bi bi-person" aria-hidden="true"></i>
                    Ver perfil del jugador
                  </button>
                  <button
                    v-if="usuario"
                    type="button"
                    class="pl-btn pl-btn--secondary"
                    @click="enviarAmistad"
                  >
                    <i class="bi bi-person-plus" aria-hidden="true"></i>
                    Petición de amistad
                  </button>
                  <button type="button" class="pl-btn pl-btn--danger-ghost" @click="abrirDenuncia">
                    <i class="bi bi-flag" aria-hidden="true"></i>
                    Denunciar personaje
                  </button>

                  <template v-if="puedeModerarPersonaje">
                    <p class="perfil-etiqueta perfil-etiqueta--moderacion">Moderación</p>
                    <button
                      type="button"
                      class="pl-btn"
                      :class="estaDesactivado ? 'pl-btn--success' : 'pl-btn--danger-ghost'"
                      :disabled="cambiandoEstado"
                      @click="solicitarDesactivar"
                    >
                      <span v-if="cambiandoEstado" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <i v-else :class="estaDesactivado ? 'bi bi-check-circle' : 'bi bi-slash-circle'" aria-hidden="true"></i>
                      {{ estaDesactivado ? 'Activar perfil' : 'Desactivar perfil' }}
                    </button>
                    <button type="button" class="pl-btn pl-btn--danger" @click="abrirBaneo">
                      <i class="bi bi-hammer" aria-hidden="true"></i>
                      Banear personaje
                    </button>
                  </template>
                </template>

                <router-link
                  v-else
                  :to="`/personajes/editar/${personaje.idPersonaje}`"
                  class="pl-btn pl-btn--primary"
                >
                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                  Editar personaje
                </router-link>
              </div>
            </div>
          </aside>

          <!-- Columna de contenido -->
          <div class="perfil-contenido">
            <div ref="tablistRef" class="perfil-tabs" role="tablist" aria-label="Contenido del personaje">
              <button
                v-for="(pestana, indice) in PESTANAS"
                :id="`tab-${pestana.id}`"
                :key="pestana.id"
                type="button"
                role="tab"
                class="perfil-tab"
                :class="{ 'is-active': tabActiva === pestana.id }"
                :aria-selected="tabActiva === pestana.id"
                :aria-controls="`panel-${pestana.id}`"
                :tabindex="tabActiva === pestana.id ? 0 : -1"
                @click="tabActiva = pestana.id"
                @keydown="onTeclaPestana($event, indice)"
              >
                <i :class="`bi ${pestana.icono}`" aria-hidden="true"></i>
                {{ pestana.etiqueta }}
              </button>
            </div>

            <section
              v-if="tabActiva === 'trasfondo'"
              id="panel-trasfondo"
              class="pl-card perfil-panel"
              role="tabpanel"
              aria-labelledby="tab-trasfondo"
              tabindex="0"
            >
              <div
                v-if="personaje.trasfondo"
                class="perfil-trasfondo"
                v-sanitize="personaje.trasfondo"
              ></div>
              <div v-else class="pl-empty-state pl-empty-state--compact">
                <span class="pl-empty-state__icon" aria-hidden="true">
                  <i class="bi bi-book"></i>
                </span>
                <p class="mb-0">Este personaje aún no tiene trasfondo escrito.</p>
              </div>
            </section>

            <section
              v-else-if="tabActiva === 'categorias'"
              id="panel-categorias"
              class="pl-card perfil-panel"
              role="tabpanel"
              aria-labelledby="tab-categorias"
              tabindex="0"
            >
              <ul v-if="categorias.length > 0" class="perfil-categorias">
                <li
                  v-for="cat in categorias"
                  :key="cat.idCategoria"
                  class="perfil-categoria"
                >
                  <span
                    class="perfil-categoria__punto"
                    :style="{ background: colorCategoria(cat) }"
                    aria-hidden="true"
                  ></span>
                  <div class="perfil-categoria__texto">
                    <p class="perfil-categoria__nombre">{{ cat.nombre }}</p>
                    <p v-if="cat.descripcion" class="perfil-categoria__desc">{{ cat.descripcion }}</p>
                  </div>
                </li>
              </ul>
              <div v-else class="pl-empty-state pl-empty-state--compact">
                <span class="pl-empty-state__icon" aria-hidden="true">
                  <i class="bi bi-tags"></i>
                </span>
                <p class="mb-0">Sin categorías asignadas.</p>
              </div>
            </section>

            <section
              v-else
              id="panel-galeria"
              class="pl-card perfil-panel"
              role="tabpanel"
              aria-labelledby="tab-galeria"
              tabindex="0"
            >
              <GaleriaImagenes
                :personaje-id="personaje.idPersonaje"
                :es-propietario="esMiPersonaje"
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>

  <Footer v-if="!modoModal" />

  <!-- Modal de denuncia -->
  <ModalFormulario
    v-if="modalDenuncia"
    :titulo="`Denunciar a ${personaje?.nombre ?? ''}`"
    @cerrar="cerrarDenuncia"
  >
    <form ref="formDenuncia" novalidate @submit.prevent="enviarDenuncia">
      <div class="pl-field">
        <label class="form-label" for="denuncia-motivo">
          Motivo <span class="text-danger" aria-hidden="true">*</span>
        </label>
        <input
          id="denuncia-motivo"
          v-model="denuncia.motivo"
          type="text"
          class="form-control"
          maxlength="200"
          required
          placeholder="¿Por qué lo denuncias?"
          :aria-invalid="erroresDenuncia.motivo ? 'true' : undefined"
          :aria-describedby="erroresDenuncia.motivo ? 'denuncia-motivo-error' : undefined"
          @input="onMotivoEditado"
        />
        <p v-if="erroresDenuncia.motivo" id="denuncia-motivo-error" class="pl-field__error">
          <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresDenuncia.motivo }}
        </p>
      </div>

      <div class="pl-field">
        <label class="form-label" for="denuncia-detalle">Detalle (opcional)</label>
        <textarea
          id="denuncia-detalle"
          v-model="denuncia.detalle"
          class="form-control"
          rows="4"
          maxlength="2000"
          placeholder="Amplía la información si lo necesitas..."
          aria-describedby="denuncia-detalle-contador"
        ></textarea>
        <p id="denuncia-detalle-contador" class="pl-field__hint text-end">
          {{ denuncia.detalle.length }}/2000
        </p>
      </div>

      <p v-if="erroresDenuncia.general" class="pl-alert pl-alert--danger mb-0" role="alert">
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresDenuncia.general }}
      </p>

      <div class="perfil-form__acciones">
        <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarDenuncia">Cancelar</button>
        <button type="submit" class="pl-btn pl-btn--danger-ghost" :disabled="enviandoDenuncia">
          <span v-if="enviandoDenuncia" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <i v-else class="bi bi-flag" aria-hidden="true"></i>
          {{ enviandoDenuncia ? 'Enviando…' : 'Enviar denuncia' }}
        </button>
      </div>
    </form>
  </ModalFormulario>

  <!-- Modal de baneo -->
  <ModalFormulario
    v-if="modalBaneo"
    :titulo="`Banear a ${personaje?.nombre ?? ''}`"
    @cerrar="cerrarBaneo"
  >
    <form @submit.prevent="banearPersonaje">
      <div class="pl-field">
        <label class="form-label" for="baneo-duracion">Duración</label>
        <select id="baneo-duracion" v-model="baneo.duracion" class="form-select">
          <option v-for="op in opcionesDuracion" :key="op.value" :value="op.value">
            {{ op.label }}
          </option>
        </select>
      </div>

      <div class="pl-field">
        <label class="form-label" for="baneo-motivo">Motivo (opcional)</label>
        <input
          id="baneo-motivo"
          v-model="baneo.motivo"
          type="text"
          class="form-control"
          maxlength="300"
          placeholder="Motivo del baneo"
        />
      </div>

      <p v-if="errorBaneo" class="pl-alert pl-alert--danger mb-0" role="alert">
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errorBaneo }}
      </p>

      <div class="perfil-form__acciones">
        <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarBaneo">Cancelar</button>
        <button type="submit" class="pl-btn pl-btn--danger" :disabled="baneando">
          <span v-if="baneando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <i v-else class="bi bi-hammer" aria-hidden="true"></i>
          {{ baneando ? 'Baneando…' : 'Banear' }}
        </button>
      </div>
    </form>
  </ModalFormulario>

  <!-- Confirmacion antes de desactivar -->
  <ModalConfirmacion
    v-if="confirmacionDesactivar"
    :mensaje="`¿Desactivar el perfil de «${personaje?.nombre ?? ''}»? Dejará de ser visible para el resto de la comunidad.`"
    titulo="Desactivar perfil"
    boton-confirmar="Desactivar"
    :peligro="true"
    @confirmar="aplicarEstado('DESACTIVADO')"
    @cancelar="confirmacionDesactivar = false"
  />

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.perfil-contenedor {
  padding-top: 0.5rem;
  padding-bottom: 1.5rem;
}

.perfil-toolbar {
  margin-bottom: 1.25rem;
}

.perfil-layout {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

/* ---- Columna lateral ---- */
.perfil-lateral {
  overflow: hidden;
  padding: 0;
}

.perfil-media {
  display: block;
  width: 100%;
  /* Sin esto el atributo height del <img> gana al aspect-ratio. */
  height: auto;
  aspect-ratio: 1;
  background: linear-gradient(135deg, rgba(var(--pl-primary-rgb), 0.16), rgba(var(--pl-cyan-rgb), 0.2));
  object-fit: cover;
  object-position: center 25%;
}

.perfil-lateral__cuerpo {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.15rem;
}

.perfil-nombre {
  margin: 0 0 0.5rem;
  color: var(--pl-ink);
  font-size: clamp(1.35rem, 2.4vw, 1.6rem);
  font-weight: 850;
  letter-spacing: -0.03em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.perfil-pildoras {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

/* ---- Datos ---- */
.perfil-datos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--pl-border);
}

.perfil-dato dt {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.15rem;
  color: var(--pl-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.perfil-dato dt i {
  color: var(--pl-primary-ink);
  font-size: 0.95em;
}

.perfil-dato dd {
  margin: 0;
  color: var(--pl-ink);
  font-size: 0.92rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}

/* ---- Propietario ---- */
.perfil-propietario {
  padding-top: 1rem;
  border-top: 1px solid var(--pl-border);
}

.perfil-etiqueta {
  margin: 0 0 0.5rem;
  color: var(--pl-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.perfil-etiqueta--moderacion {
  margin-top: 0.35rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--pl-border);
}

.perfil-propietario__fila {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.perfil-propietario__avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px #fff, 0 0 0 4px var(--pl-border);
}

.perfil-propietario__info {
  min-width: 0;
}

.perfil-propietario__nombre {
  margin: 0;
  color: var(--pl-ink);
  font-size: 0.95rem;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.perfil-propietario__estado {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  color: var(--pl-muted);
  font-size: 0.78rem;
}

.perfil-punto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pl-muted);
}

.perfil-punto--online {
  background: var(--pl-success);
  box-shadow: 0 0 0 3px rgba(var(--pl-success-rgb), 0.18);
}

.perfil-acciones {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Sin bloque de propietario, las acciones abren su propia seccion. */
.perfil-acciones--suelta {
  margin-top: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--pl-border);
}

.perfil-acciones .pl-btn {
  width: 100%;
  justify-content: center;
}

/* ---- Columna de contenido ---- */
.perfil-contenido {
  min-width: 0;
}

.perfil-tabs {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 1rem;
  padding: 0.4rem;
  overflow-x: auto;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-lg);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-sm);
}

.perfil-tab {
  display: inline-flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0.6rem 0.9rem;
  border: 1px solid transparent;
  border-radius: var(--pl-radius-md);
  color: var(--pl-muted);
  background: transparent;
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard);
}

.perfil-tab:hover {
  color: var(--pl-ink);
  background: var(--pl-surface-soft);
}

.perfil-tab.is-active {
  color: var(--pl-primary-ink);
  background: rgba(var(--pl-primary-rgb), 0.1);
  border-color: rgba(var(--pl-primary-rgb), 0.22);
}

.perfil-panel {
  padding: 1.5rem;
}

.perfil-panel:focus-visible {
  outline: 3px solid rgba(var(--pl-primary-rgb), 0.24);
  outline-offset: 3px;
}

/* ---- Trasfondo ---- */
.perfil-trasfondo {
  color: var(--pl-ink);
  font-size: 0.95rem;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.perfil-trasfondo :deep(h1),
.perfil-trasfondo :deep(h2),
.perfil-trasfondo :deep(h3) {
  margin-top: 1.2rem;
  margin-bottom: 0.6rem;
  color: var(--pl-ink);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.perfil-trasfondo :deep(p:last-child) {
  margin-bottom: 0;
}

.perfil-trasfondo :deep(strong) {
  color: var(--pl-ink);
  font-weight: 800;
}

.perfil-trasfondo :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 0.75rem 0;
  border-radius: var(--pl-radius-md);
}

.perfil-trasfondo :deep(blockquote) {
  margin: 1rem 0;
  padding-left: 1rem;
  border-left: 3px solid var(--pl-primary);
  color: var(--pl-muted);
  font-style: italic;
}

.perfil-trasfondo :deep(a) {
  color: var(--pl-primary-ink);
}

/* ---- Categorias ---- */
.perfil-categorias {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.perfil-categoria {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.8rem 0.95rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface-soft);
}

.perfil-categoria__punto {
  width: 10px;
  height: 10px;
  margin-top: 0.35rem;
  flex-shrink: 0;
  border-radius: 50%;
}

.perfil-categoria__texto {
  min-width: 0;
}

.perfil-categoria__nombre {
  margin: 0;
  color: var(--pl-ink);
  font-size: 0.95rem;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.perfil-categoria__desc {
  margin: 0.15rem 0 0;
  color: var(--pl-muted);
  font-size: 0.85rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* ---- Vacio ---- */
.perfil-vacio__titulo {
  margin: 0 0 0.35rem;
  color: var(--pl-ink);
  font-size: 1.2rem;
  font-weight: 850;
}

/* ---- Formularios en modales ---- */
.perfil-form__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

/* ---- Esqueletos ---- */
.perfil-esqueleto {
  border-radius: var(--pl-radius-lg);
  background: linear-gradient(
    100deg,
    var(--pl-surface-soft) 30%,
    var(--pl-surface) 50%,
    var(--pl-surface-soft) 70%
  );
  background-size: 200% 100%;
  box-shadow: inset 0 0 0 1px var(--pl-border);
  animation: perfil-esqueleto 1.4s ease-in-out infinite;
}

.perfil-esqueleto--lateral {
  min-height: 520px;
}

.perfil-esqueleto--contenido {
  min-height: 360px;
}

@keyframes perfil-esqueleto {
  to {
    background-position: -200% 0;
  }
}

/* Sin movimiento: el esqueleto se queda como bloque estatico con el mismo tinte. */
@media (prefers-reduced-motion: reduce) {
  .perfil-esqueleto {
    animation: none;
  }
}

/* ---- Modo modal (chat) ---- */
.perfil-modal-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--pl-border);
  background: var(--pl-surface);
  flex-shrink: 0;
}

.perfil-modal-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.perfil-modal-pagina {
  padding: 1.25rem 0 2rem;
}

@media (max-width: 991.98px) {
  .perfil-layout {
    grid-template-columns: minmax(0, 260px) minmax(0, 1fr);
  }
}

@media (max-width: 767.98px) {
  .perfil-layout {
    grid-template-columns: 1fr;
  }

  .perfil-esqueleto--lateral {
    min-height: 320px;
  }

  .perfil-panel {
    padding: 1.15rem;
  }
}

@media (max-width: 575.98px) {
  .perfil-tabs {
    overflow-x: visible;
  }

  .perfil-tab {
    flex: 1 1 0;
    padding: 0.55rem 0.4rem;
    font-size: 0.84rem;
  }

  .perfil-form__acciones {
    flex-direction: column-reverse;
  }

  .perfil-form__acciones .pl-btn {
    width: 100%;
  }
}
</style>

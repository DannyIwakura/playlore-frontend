<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import ModalAviso from '../../components/ModalAviso.vue'
import ModalConfirmacion from '../../components/ModalConfirmacion.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'
import { indicePestanaParaTecla } from '../../composables/usePestanas'

const API_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${API_URL}/images/AVATAR.png`

interface AmigoDTO {
  id: number
  nombre: string
  avatar: string | null
  ultimaConexion: string | null
}

interface SolicitudDTO {
  id: number
  emisorId: number
  emisorNombre: string
  emisorAvatar?: string | null
  receptorId: number
  receptorNombre: string
  receptorAvatar?: string | null
  fechaPeticion?: string | null
}

type Pestana = 'amigos' | 'recibidas' | 'enviadas'

const PESTANAS: { id: Pestana; etiqueta: string; icono: string }[] = [
  { id: 'amigos', etiqueta: 'Amigos', icono: 'bi-people-fill' },
  { id: 'recibidas', etiqueta: 'Solicitudes recibidas', icono: 'bi-inbox-fill' },
  { id: 'enviadas', etiqueta: 'Solicitudes enviadas', icono: 'bi-send-fill' },
]

const miId = computed(() => userStore.usuario.value?.id)

const tabActiva = ref<Pestana>('amigos')
const tablistRef = ref<HTMLElement | null>(null)

const amigos = ref<AmigoDTO[]>([])
const recibidas = ref<SolicitudDTO[]>([])
const enviadas = ref<SolicitudDTO[]>([])
const cargando = ref(false)
const errorCarga = ref('')
const aviso = ref<string | null>(null)
const procesando = ref<string | null>(null)

const mostrarBuscar = ref(false)
const nombreBusqueda = ref('')
const inputBusqueda = ref<HTMLInputElement | null>(null)
const resultadoBusqueda = ref<any>(null)
const cargandoBusqueda = ref(false)
const enviandoSolicitud = ref(false)
const errorBusqueda = ref('')
const solicitudEnviada = ref(false)

const amigoAEliminar = ref<AmigoDTO | null>(null)
const yaEsAmigo = ref(false)

const esSiMismo = computed(() => resultadoBusqueda.value?.userId === miId.value)

const estadoBusqueda = computed(() => {
  if (cargandoBusqueda.value) return 'Buscando usuarios…'
  if (errorBusqueda.value || !resultadoBusqueda.value) return ''
  return `Un resultado: ${resultadoBusqueda.value.nombre}`
})

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) {
    return avatar
  }

  return API_URL + avatar
}

function tiempoDesde(fecha: string | null | undefined): string {
  if (!fecha) return 'Sin conexiones recientes'
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (min < 1) return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  if (h < 24) return `Hace ${h} h`
  if (d < 7) return `Hace ${d} día${d > 1 ? 's' : ''}`
  return `Última conexión: ${formatFecha(fecha)}`
}

function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function contador(id: Pestana): number {
  if (id === 'amigos') return amigos.value.length
  if (id === 'recibidas') return recibidas.value.length
  return enviadas.value.length
}

function seleccionar(id: Pestana) {
  tabActiva.value = id
}

function onTeclaPestana(event: KeyboardEvent, indice: number) {
  const nuevo = indicePestanaParaTecla(event.key, indice, PESTANAS.length)
  if (nuevo === null) return

  event.preventDefault()
  seleccionar(PESTANAS[nuevo].id)
  nextTick(() => {
    tablistRef.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nuevo]?.focus()
  })
}

async function cargarTodo(silencioso = false) {
  if (!miId.value) return

  if (!silencioso) cargando.value = true
  errorCarga.value = ''

  try {
    const [resAmigos, resRecibidas, resEnviadas] = await Promise.all([
      api.get(`/usuarios/${miId.value}/amigos`),
      api.get(`/amistades/pendientes-recibidas/${miId.value}`),
      api.get(`/amistades/pendientes-enviadas/${miId.value}`),
    ])
    amigos.value = resAmigos.data
    recibidas.value = resRecibidas.data
    enviadas.value = resEnviadas.data
  } catch {
    if (!silencioso) errorCarga.value = 'No se pudieron cargar tus amistades.'
  } finally {
    if (!silencioso) cargando.value = false
  }
}

async function ejecutarAccion(clave: string, accion: () => Promise<unknown>, mensajeError: string) {
  if (procesando.value) return

  procesando.value = clave
  try {
    await accion()
    await cargarTodo(true)
  } catch {
    aviso.value = mensajeError
  } finally {
    procesando.value = null
  }
}

function alternarBuscador() {
  mostrarBuscar.value = !mostrarBuscar.value
  if (mostrarBuscar.value) {
    nextTick(() => inputBusqueda.value?.focus())
  }
}

async function buscarUsuario() {
  errorBusqueda.value = ''
  resultadoBusqueda.value = null
  solicitudEnviada.value = false
  yaEsAmigo.value = false

  const nombre = nombreBusqueda.value.trim()
  if (!nombre) {
    errorBusqueda.value = 'Escribe un nombre para buscar.'
    inputBusqueda.value?.focus()
    return
  }

  cargandoBusqueda.value = true
  try {
    const res = await api.get('/usuarios/buscar', { params: { nombre } })
    resultadoBusqueda.value = res.data

    const receptorId = res.data.userId
    // El estado de amistad es informativo: si falla, el resultado sigue visible.
    try {
      const [resSolicitud, resAmigos] = await Promise.all([
        api.get(`/amistades/comprobar-existencia/${miId.value}/${receptorId}`),
        api.get(`/usuarios/${miId.value}/amigos`),
      ])
      solicitudEnviada.value = resSolicitud.data
      yaEsAmigo.value = resAmigos.data.some((a: any) => a.id === receptorId)
    } catch {
      // Se mantiene el estado por defecto del boton de solicitud.
    }
  } catch {
    errorBusqueda.value = 'No se encontró ningún usuario con ese nombre.'
  } finally {
    cargandoBusqueda.value = false
  }
}

async function enviarSolicitud(receptorId: number) {
  errorBusqueda.value = ''
  enviandoSolicitud.value = true
  try {
    await api.post('/amistades', { emisorId: miId.value, receptorId })
    solicitudEnviada.value = true
    await cargarTodo(true)
  } catch {
    errorBusqueda.value = 'No se pudo enviar la solicitud.'
  } finally {
    enviandoSolicitud.value = false
  }
}

async function aceptarSolicitud(idSolicitud: number) {
  await ejecutarAccion(
    `recibida-${idSolicitud}`,
    () => api.put(`/amistades/aceptar/${idSolicitud}`),
    'No se pudo aceptar la solicitud.'
  )
}

async function rechazarSolicitud(idSolicitud: number) {
  await ejecutarAccion(
    `recibida-${idSolicitud}`,
    () => api.put(`/amistades/rechazar/${idSolicitud}`),
    'No se pudo rechazar la solicitud.'
  )
}

async function cancelarSolicitud(idSolicitud: number) {
  await ejecutarAccion(
    `enviada-${idSolicitud}`,
    () => api.delete(`/amistades/${idSolicitud}`),
    'No se pudo cancelar la solicitud.'
  )
}

async function eliminarAmigo() {
  const amigo = amigoAEliminar.value
  if (!amigo) return
  amigoAEliminar.value = null
  await ejecutarAccion(
    `amigo-${amigo.id}`,
    () => api.delete(`/usuarios/${miId.value}/amigos/${amigo.id}`),
    'No se pudo eliminar a este amigo.'
  )
}

watch(tabActiva, () => {
  mostrarBuscar.value = false
  errorBusqueda.value = ''
  resultadoBusqueda.value = null
})

onMounted(async () => {
  await userStore.cargarDesdeToken()
  await cargarTodo()
})
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header amigos-cabecera">
        <div>
          <span class="pl-kicker">Tu comunidad</span>
          <h1 class="pl-page-title">Amigos</h1>
          <p class="pl-lead">Gestiona tus amigos y las solicitudes de amistad en un solo lugar.</p>
        </div>
        <button
          v-if="tabActiva === 'amigos'"
          type="button"
          class="pl-btn pl-btn--primary"
          :aria-expanded="mostrarBuscar"
          aria-controls="buscador-amigos"
          @click="alternarBuscador"
        >
          <i class="bi bi-person-plus-fill" aria-hidden="true"></i>
          {{ mostrarBuscar ? 'Cerrar buscador' : 'Añadir amigo' }}
        </button>
      </header>

      <section v-show="mostrarBuscar" id="buscador-amigos" class="amigos-buscador">
        <search>
          <form
            class="pl-card amigos-buscador__card"
            :aria-busy="cargandoBusqueda || undefined"
            @submit.prevent="buscarUsuario"
          >
            <h2 class="amigos-buscador__titulo">Buscar usuario</h2>

            <div class="amigos-buscador__fila">
              <div class="pl-field flex-grow-1 mb-0">
                <label class="visually-hidden" for="buscar-amigo">Nombre de usuario</label>
                <input
                  id="buscar-amigo"
                  ref="inputBusqueda"
                  v-model="nombreBusqueda"
                  type="search"
                  class="form-control"
                  placeholder="Nombre exacto de usuario"
                  autocomplete="off"
                  enterkeyhint="search"
                  :aria-invalid="errorBusqueda ? 'true' : undefined"
                  :aria-describedby="errorBusqueda ? 'busqueda-ayuda busqueda-error' : 'busqueda-ayuda'"
                />
                <p id="busqueda-ayuda" class="pl-field__hint">Busca por el nombre exacto con el que se registró.</p>
              </div>
              <button type="submit" class="pl-btn pl-btn--primary" :disabled="cargandoBusqueda">
                <span v-if="cargandoBusqueda" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <i v-else class="bi bi-search" aria-hidden="true"></i>
                {{ cargandoBusqueda ? 'Buscando…' : 'Buscar' }}
              </button>
            </div>

            <p v-if="errorBusqueda" id="busqueda-error" class="pl-field__error" role="alert">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errorBusqueda }}
            </p>

            <p class="visually-hidden" role="status">{{ estadoBusqueda }}</p>

            <div v-if="resultadoBusqueda" class="amigos-resultado">
              <img
                :src="avatarUrl(resultadoBusqueda.avatar)"
                class="pl-avatar amigos-resultado__avatar"
                width="48"
                height="48"
                :alt="`Avatar de ${resultadoBusqueda.nombre}`"
              />
              <div class="amigos-resultado__info">
                <p class="amigos-resultado__nombre">{{ resultadoBusqueda.nombre }}</p>
                <small class="text-muted">Usuario de PlayLore</small>
              </div>

              <span v-if="esSiMismo" class="pl-status-pill pl-status-pill--neutral">Eres tú</span>
              <span v-else-if="yaEsAmigo" class="pl-status-pill">
                <i class="bi bi-person-check" aria-hidden="true"></i>Amigo
              </span>
              <button
                v-else
                type="button"
                class="pl-btn pl-btn--success pl-btn--sm"
                :disabled="solicitudEnviada || enviandoSolicitud"
                @click="enviarSolicitud(resultadoBusqueda.userId)"
              >
                <span v-if="enviandoSolicitud" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <i v-else-if="solicitudEnviada" class="bi bi-check-lg" aria-hidden="true"></i>
                <i v-else class="bi bi-person-plus" aria-hidden="true"></i>
                {{ solicitudEnviada ? 'Solicitud enviada' : 'Enviar solicitud' }}
              </button>
            </div>
          </form>
        </search>
      </section>

      <div class="amigos-layout">
        <div
          ref="tablistRef"
          class="amigos-tabs"
          role="tablist"
          aria-label="Amistades"
        >
          <button
            v-for="(pestana, indice) in PESTANAS"
            :key="pestana.id"
            :id="`tab-${pestana.id}`"
            type="button"
            role="tab"
            class="amigos-tab"
            :class="{ 'is-active': tabActiva === pestana.id }"
            :aria-selected="tabActiva === pestana.id"
            :aria-controls="`panel-${pestana.id}`"
            :tabindex="tabActiva === pestana.id ? 0 : -1"
            @click="seleccionar(pestana.id)"
            @keydown="onTeclaPestana($event, indice)"
          >
            <i :class="`bi ${pestana.icono}`" aria-hidden="true"></i>
            <span class="amigos-tab__texto">{{ pestana.etiqueta }}</span>
            <span v-if="contador(pestana.id) > 0" class="amigos-tab__cuenta">
              {{ contador(pestana.id) }}
            </span>
          </button>
        </div>

        <div class="amigos-panel">
          <div v-if="cargando" class="pl-empty-state pl-empty-state--compact" role="status">
            <div class="spinner-border text-primary" aria-hidden="true"></div>
            <span>Cargando tus amistades...</span>
          </div>

          <div v-else-if="errorCarga" class="amigos-panel__error">
            <div class="pl-alert pl-alert--danger" role="alert">
              <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
              <span class="flex-grow-1">{{ errorCarga }}</span>
            </div>
            <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="cargarTodo()">
              Reintentar
            </button>
          </div>

          <div
            v-else-if="tabActiva === 'amigos'"
            id="panel-amigos"
            role="tabpanel"
            aria-labelledby="tab-amigos"
            tabindex="0"
          >
            <div v-if="amigos.length === 0" class="pl-empty-state pl-empty-state--compact">
              <span class="pl-empty-state__icon"><i class="bi bi-people" aria-hidden="true"></i></span>
              <p class="mb-0">Aún no tienes compañeros de aventura. Usa «Añadir amigo» para buscar a alguien.</p>
            </div>
            <ul v-else class="amigos-lista">
              <li v-for="amigo in amigos" :key="amigo.id" class="pl-list-item amigos-fila">
                <img
                  :src="avatarUrl(amigo.avatar)"
                  class="pl-avatar amigos-fila__avatar"
                  width="48"
                  height="48"
                  :alt="`Avatar de ${amigo.nombre}`"
                />
                <div class="amigos-fila__info">
                  <p class="amigos-fila__nombre">{{ amigo.nombre }}</p>
                  <small class="amigos-fila__meta">{{ tiempoDesde(amigo.ultimaConexion) }}</small>
                </div>
                <div class="amigos-fila__acciones">
                  <router-link :to="`/perfil/${amigo.id}`" class="pl-btn pl-btn--ghost pl-btn--sm">
                    <i class="bi bi-person" aria-hidden="true"></i>Perfil
                  </router-link>
                  <button
                    type="button"
                    class="pl-btn pl-btn--danger-ghost pl-btn--sm"
                    :disabled="!!procesando"
                    @click="amigoAEliminar = amigo"
                  >
                    <span
                      v-if="procesando === `amigo-${amigo.id}`"
                      class="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    ></span>
                    <i v-else class="bi bi-person-dash" aria-hidden="true"></i>Eliminar
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div
            v-else-if="tabActiva === 'recibidas'"
            id="panel-recibidas"
            role="tabpanel"
            aria-labelledby="tab-recibidas"
            tabindex="0"
          >
            <div v-if="recibidas.length === 0" class="pl-empty-state pl-empty-state--compact">
              <span class="pl-empty-state__icon"><i class="bi bi-envelope-open" aria-hidden="true"></i></span>
              <p class="mb-0">No tienes solicitudes pendientes.</p>
            </div>
            <ul v-else class="amigos-lista">
              <li v-for="sol in recibidas" :key="sol.id" class="pl-list-item amigos-fila">
                <img
                  :src="avatarUrl(sol.emisorAvatar)"
                  class="pl-avatar amigos-fila__avatar"
                  width="48"
                  height="48"
                  :alt="`Avatar de ${sol.emisorNombre}`"
                />
                <div class="amigos-fila__info">
                  <p class="amigos-fila__nombre">{{ sol.emisorNombre }}</p>
                  <small class="amigos-fila__meta">
                    Quiere ser tu amigo · {{ formatFecha(sol.fechaPeticion) }}
                  </small>
                </div>
                <div class="amigos-fila__acciones">
                  <button
                    type="button"
                    class="pl-btn pl-btn--success pl-btn--sm"
                    :disabled="!!procesando"
                    @click="aceptarSolicitud(sol.id)"
                  >
                    <span
                      v-if="procesando === `recibida-${sol.id}`"
                      class="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    ></span>
                    <i v-else class="bi bi-check-lg" aria-hidden="true"></i>Aceptar
                  </button>
                  <button
                    type="button"
                    class="pl-btn pl-btn--secondary pl-btn--sm"
                    :disabled="!!procesando"
                    @click="rechazarSolicitud(sol.id)"
                  >
                    <i class="bi bi-x-lg" aria-hidden="true"></i>Rechazar
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div
            v-else
            id="panel-enviadas"
            role="tabpanel"
            aria-labelledby="tab-enviadas"
            tabindex="0"
          >
            <div v-if="enviadas.length === 0" class="pl-empty-state pl-empty-state--compact">
              <span class="pl-empty-state__icon"><i class="bi bi-send" aria-hidden="true"></i></span>
              <p class="mb-0">No has enviado ninguna solicitud.</p>
            </div>
            <ul v-else class="amigos-lista">
              <li v-for="sol in enviadas" :key="sol.id" class="pl-list-item amigos-fila">
                <img
                  :src="avatarUrl(sol.receptorAvatar)"
                  class="pl-avatar amigos-fila__avatar"
                  width="48"
                  height="48"
                  :alt="`Avatar de ${sol.receptorNombre}`"
                />
                <div class="amigos-fila__info">
                  <p class="amigos-fila__nombre">{{ sol.receptorNombre }}</p>
                  <small class="amigos-fila__meta">
                    <span class="pl-status-pill pl-status-pill--warning">Pendiente</span>
                    <span class="ms-2">Enviada el {{ formatFecha(sol.fechaPeticion) }}</span>
                  </small>
                </div>
                <div class="amigos-fila__acciones">
                  <button
                    type="button"
                    class="pl-btn pl-btn--danger-ghost pl-btn--sm"
                    :disabled="!!procesando"
                    @click="cancelarSolicitud(sol.id)"
                  >
                    <span
                      v-if="procesando === `enviada-${sol.id}`"
                      class="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    ></span>
                    <i v-else class="bi bi-x-circle" aria-hidden="true"></i>Cancelar
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </main>

  <ModalConfirmacion
    v-if="amigoAEliminar"
    titulo="Eliminar amigo"
    :mensaje="`¿Seguro que quieres eliminar a ${amigoAEliminar.nombre} de tu lista de amigos? Esta acción no se puede deshacer.`"
    botonConfirmar="Eliminar"
    :peligro="true"
    @confirmar="eliminarAmigo"
    @cancelar="amigoAEliminar = null"
  />

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />

  <Footer />
</template>

<style scoped>
.amigos-cabecera {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.amigos-cabecera .pl-page-title {
  margin-bottom: 0.5rem;
}

.amigos-buscador {
  margin-bottom: 1.5rem;
}

.amigos-buscador__card {
  padding: 1.25rem;
}

.amigos-buscador__titulo {
  margin-bottom: 0.85rem;
  font-size: 1.05rem;
  font-weight: 800;
}

.amigos-buscador__fila {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.amigos-buscador__fila .pl-btn {
  min-height: 46px;
}

.amigos-resultado {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface-soft);
}

.amigos-resultado__avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.amigos-resultado__info {
  flex: 1;
  min-width: 0;
}

.amigos-resultado__nombre {
  margin: 0;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.amigos-layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.amigos-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-lg);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-sm);
  position: sticky;
  top: 96px;
}

.amigos-tab {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.68rem 0.8rem;
  border: 1px solid transparent;
  border-radius: var(--pl-radius-md);
  color: var(--pl-muted);
  background: transparent;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: left;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard), border-color var(--pl-duration-fast) var(--pl-ease-standard);
}

.amigos-tab:hover {
  color: var(--pl-ink);
  background: var(--pl-surface-soft);
}

.amigos-tab.is-active {
  color: var(--pl-primary-ink);
  background: rgba(var(--pl-primary-rgb), 0.1);
  border-color: rgba(var(--pl-primary-rgb), 0.22);
}

.amigos-tab__texto {
  flex: 1;
}

.amigos-tab__cuenta {
  min-width: 22px;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  color: var(--pl-primary-ink);
  background: rgba(var(--pl-primary-rgb), 0.14);
  font-size: 0.75rem;
  font-weight: 800;
  text-align: center;
}

.amigos-panel {
  min-height: 420px;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-lg);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-sm);
  overflow: hidden;
}

.amigos-panel .pl-empty-state {
  margin: 1rem;
  border: 0;
  background: transparent;
}

.amigos-panel__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.25rem;
}

.amigos-panel__error .pl-alert {
  width: 100%;
  margin-bottom: 0;
}

.amigos-lista {
  margin: 0;
  padding: 0;
  list-style: none;
}

.amigos-fila {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--pl-border);
}

.amigos-fila:last-child {
  border-bottom: 0;
}

.amigos-fila__avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.amigos-fila__info {
  flex: 1;
  min-width: 0;
}

.amigos-fila__nombre {
  margin: 0;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.amigos-fila__meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--pl-muted);
  font-size: 0.82rem;
}

.amigos-fila__acciones {
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .amigos-panel {
    max-height: 620px;
    overflow-y: auto;
  }
}

@media (max-width: 991.98px) {
  .amigos-layout {
    grid-template-columns: 210px minmax(0, 1fr);
  }
}

@media (max-width: 767.98px) {
  .amigos-layout {
    grid-template-columns: 1fr;
  }

  .amigos-tabs {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    gap: 0.3rem;
    padding: 0.4rem;
  }

  .amigos-tab {
    width: auto;
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .amigos-tab__texto {
    flex: 0 0 auto;
  }
}

@media (max-width: 575.98px) {
  .amigos-cabecera {
    align-items: stretch;
    flex-direction: column;
  }

  .amigos-cabecera .pl-btn {
    width: 100%;
  }

  .amigos-buscador__fila {
    flex-direction: column;
    align-items: stretch;
  }

  .amigos-buscador__fila .pl-btn {
    width: 100%;
  }

  .amigos-resultado {
    flex-wrap: wrap;
  }

  .amigos-resultado .pl-btn,
  .amigos-resultado .pl-status-pill {
    width: 100%;
    justify-content: center;
  }

  .amigos-fila {
    flex-wrap: wrap;
  }

  .amigos-fila__acciones {
    width: 100%;
  }

  .amigos-fila__acciones .pl-btn {
    flex: 1;
  }
}
</style>

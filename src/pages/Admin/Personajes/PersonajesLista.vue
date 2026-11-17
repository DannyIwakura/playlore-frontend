<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../../services/api'
import PaginadorComponent from '../../../components/PaginadorComponent.vue'
import ModalConfirmacion from '../../../components/ModalConfirmacion.vue'
import TablaAdmin from '../components/TablaAdmin.vue'

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`
const TAMANIO_PAGINA = 10

interface Personaje {
  idPersonaje: number
  nombre: string
  avatar: string | null
  genero: string | null
  raza: string | null
  clase: string | null
  estadoPersonaje: string | null
  edadPersonaje: number | null
  userId: number
  nombreUsuario: string | null
}

interface Confirmacion {
  titulo: string
  mensaje: string
  boton: string
  ejecutar: () => Promise<void>
}

const columnas = [
  { etiqueta: 'Personaje' },
  { etiqueta: 'Propietario' },
  { etiqueta: 'Raza' },
  { etiqueta: 'Clase' },
  { etiqueta: 'Estado' },
  { etiqueta: 'Acciones' },
]

const personajes = ref<Personaje[]>([])
const cargando = ref(false)
const error = ref('')
const feedback = ref<{ tipo: 'success' | 'danger'; texto: string } | null>(null)

const paginaActual = ref(0)
const totalPaginas = ref(0)
const totalElementos = ref(0)

const filtroNombre = ref('')
const filtroAplicado = ref('')

const confirmacion = ref<Confirmacion | null>(null)

const resumen = computed(() => {
  const total = totalElementos.value
  const sustantivo = total === 1 ? 'personaje' : 'personajes'
  if (filtroAplicado.value) {
    return `${total} ${sustantivo} para «${filtroAplicado.value}»`
  }
  return `${total} ${sustantivo} en total`
})

const mensajeVacio = computed(() =>
  filtroAplicado.value
    ? `Ningún personaje coincide con «${filtroAplicado.value}».`
    : 'No hay personajes registrados todavía.'
)

// El listado solo devuelve el id del dueño: se resuelve una vez por usuario y
// se cachea la propia promesa para que las filas simultáneas compartan la
// petición en lugar de lanzar una por cada personaje del mismo dueño.
const nombresUsuario = new Map<number, Promise<string | null>>()

function nombreDeUsuario(id: number): Promise<string | null> {
  const enCurso = nombresUsuario.get(id)
  if (enCurso) return enCurso

  const promesa = api
    .get(`/usuarios/${id}`)
    .then(({ data }) => (data?.nombre as string | undefined) ?? null)
    .catch(() => {
      // No se cachea el fallo para poder reintentarlo en la siguiente carga.
      nombresUsuario.delete(id)
      return null
    })

  nombresUsuario.set(id, promesa)
  return promesa
}

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return `${import.meta.env.VITE_API_URL}${avatar}`
}

function claseEstado(estado: string | null): string {
  if (estado === 'ACTIVO') return 'pl-status-pill'
  if (estado === 'DESACTIVADO') return 'pl-status-pill pl-status-pill--danger'
  return 'pl-status-pill pl-status-pill--neutral'
}

async function cargarPersonajes(pagina = 0) {
  cargando.value = true
  error.value = ''
  try {
    const params: Record<string, string | number> = { page: pagina, size: TAMANIO_PAGINA }
    if (filtroAplicado.value) params.nombre = filtroAplicado.value

    const { data } = await api.get('/personajes/buscar', { params })
    const filas: Personaje[] = data.content ?? []
    const conPropietario = await Promise.all(
      filas.map(async (personaje) => ({
        ...personaje,
        nombreUsuario: await nombreDeUsuario(personaje.userId),
      }))
    )

    personajes.value = conPropietario
    totalPaginas.value = data.totalPages ?? 0
    totalElementos.value = data.totalElements ?? conPropietario.length
    paginaActual.value = data.number ?? 0
  } catch {
    personajes.value = []
    error.value = 'Error al cargar los personajes.'
  } finally {
    cargando.value = false
  }
}

function buscar() {
  filtroAplicado.value = filtroNombre.value.trim()
  cargarPersonajes(0)
}

function limpiarBusqueda() {
  filtroNombre.value = ''
  filtroAplicado.value = ''
  cargarPersonajes(0)
}

async function cambiarEstado(personaje: Personaje, nuevoEstado: 'ACTIVO' | 'DESACTIVADO') {
  try {
    await api.put(`/personajes/admin/${personaje.idPersonaje}/estado`, { estado: nuevoEstado })
    feedback.value = {
      tipo: 'success',
      texto:
        nuevoEstado === 'ACTIVO'
          ? `Se activó a ${personaje.nombre}.`
          : `Se suspendió a ${personaje.nombre}.`,
    }
    await cargarPersonajes(paginaActual.value)
  } catch {
    feedback.value = { tipo: 'danger', texto: 'No se pudo cambiar el estado del personaje.' }
  }
}

function pedirSuspender(personaje: Personaje) {
  confirmacion.value = {
    titulo: 'Suspender personaje',
    mensaje: `¿Suspender a ${personaje.nombre}? Su perfil dejará de estar activo hasta que se vuelva a activar.`,
    boton: 'Suspender',
    ejecutar: () => cambiarEstado(personaje, 'DESACTIVADO'),
  }
}

function pedirEliminar(personaje: Personaje) {
  confirmacion.value = {
    titulo: 'Eliminar personaje',
    mensaje: `¿Eliminar a ${personaje.nombre}? Esta acción no se puede deshacer.`,
    boton: 'Eliminar',
    ejecutar: async () => {
      try {
        await api.delete(`/personajes/${personaje.idPersonaje}`)
        feedback.value = { tipo: 'success', texto: `Se eliminó a ${personaje.nombre}.` }
        await cargarPersonajes(paginaActual.value)
      } catch {
        feedback.value = { tipo: 'danger', texto: 'No se pudo eliminar el personaje.' }
      }
    },
  }
}

async function confirmar() {
  const accion = confirmacion.value
  if (!accion) return
  confirmacion.value = null
  await accion.ejecutar()
}

onMounted(() => cargarPersonajes())
</script>

<template>
  <div>
    <div
      v-if="feedback"
      class="pl-alert"
      :class="`pl-alert--${feedback.tipo}`"
      :role="feedback.tipo === 'danger' ? 'alert' : 'status'"
    >
      <i
        class="bi"
        :class="feedback.tipo === 'danger' ? 'bi-exclamation-triangle' : 'bi-check-circle'"
        aria-hidden="true"
      ></i>
      <span>{{ feedback.texto }}</span>
      <button type="button" class="btn-close ms-auto" aria-label="Cerrar aviso" @click="feedback = null"></button>
    </div>

    <TablaAdmin
      titulo="Personajes de la plataforma"
      :columnas="columnas"
      :total="personajes.length"
      :cargando="cargando"
      :error="error"
      :vacio="mensajeVacio"
      :resumen="resumen"
    >
      <template #barra>
        <form class="pl-admin-barra" role="search" @submit.prevent="buscar">
          <div class="pl-admin-barra__campo">
            <label for="personajes-buscar">Buscar personaje</label>
            <input
              id="personajes-buscar"
              v-model="filtroNombre"
              type="search"
              class="form-control"
              placeholder="Nombre del personaje"
              autocomplete="off"
            />
          </div>
          <div class="pl-admin-barra__acciones">
            <button type="submit" class="pl-btn pl-btn--primary pl-btn--sm">
              <i class="bi bi-search" aria-hidden="true"></i>
              Buscar
            </button>
            <button
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :disabled="!filtroNombre && !filtroAplicado"
              @click="limpiarBusqueda"
            >
              <i class="bi bi-eraser" aria-hidden="true"></i>
              Limpiar
            </button>
          </div>
          <p class="pl-admin-barra__nota">
            La búsqueda recorre todos los personajes, no solo los de esta página.
          </p>
        </form>
      </template>

      <tr v-for="personaje in personajes" :key="personaje.idPersonaje">
        <th scope="row">
          <div class="pl-tabla-admin__principal">
            <img class="pl-tabla-admin__avatar" :src="avatarUrl(personaje.avatar)" alt="" />
            <div class="pl-tabla-admin__principal-texto">
              <strong>{{ personaje.nombre }}</strong>
              <span class="pl-tabla-admin__secundario">#{{ personaje.idPersonaje }}</span>
            </div>
          </div>
        </th>
        <td data-etiqueta="Propietario">
          <span v-if="personaje.nombreUsuario">{{ personaje.nombreUsuario }}</span>
          <span v-else class="pl-tabla-admin__secundario">Cuenta #{{ personaje.userId }}</span>
        </td>
        <td data-etiqueta="Raza">{{ personaje.raza || '—' }}</td>
        <td data-etiqueta="Clase">{{ personaje.clase || '—' }}</td>
        <td data-etiqueta="Estado">
          <span :class="claseEstado(personaje.estadoPersonaje)">
            {{ personaje.estadoPersonaje || 'Sin estado' }}
          </span>
        </td>
        <td data-etiqueta="Acciones">
          <div class="pl-tabla-admin__acciones">
            <button
              v-if="personaje.estadoPersonaje === 'ACTIVO'"
              type="button"
              class="pl-btn pl-btn--danger-ghost pl-btn--sm"
              :aria-label="`Suspender a ${personaje.nombre}`"
              @click="pedirSuspender(personaje)"
            >
              <i class="bi bi-slash-circle" aria-hidden="true"></i>
              Suspender
            </button>
            <button
              v-else
              type="button"
              class="pl-btn pl-btn--success pl-btn--sm"
              :aria-label="`Activar a ${personaje.nombre}`"
              @click="cambiarEstado(personaje, 'ACTIVO')"
            >
              <i class="bi bi-check-circle" aria-hidden="true"></i>
              Activar
            </button>
            <router-link
              :to="`/personaje/${personaje.idPersonaje}`"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Ver el perfil de ${personaje.nombre}`"
            >
              <i class="bi bi-eye" aria-hidden="true"></i>
              Ver
            </router-link>
            <button
              type="button"
              class="pl-btn pl-btn--danger-ghost pl-btn--sm"
              :aria-label="`Eliminar a ${personaje.nombre}`"
              @click="pedirEliminar(personaje)"
            >
              <i class="bi bi-trash" aria-hidden="true"></i>
              Eliminar
            </button>
          </div>
        </td>
      </tr>

      <template #pie>
        <PaginadorComponent
          :paginaActual="paginaActual"
          :totalPaginas="totalPaginas"
          @cambiar="cargarPersonajes"
        />
      </template>
    </TablaAdmin>

    <ModalConfirmacion
      v-if="confirmacion"
      :mensaje="confirmacion.mensaje"
      :titulo="confirmacion.titulo"
      :boton-confirmar="confirmacion.boton"
      :peligro="true"
      @confirmar="confirmar"
      @cancelar="confirmacion = null"
    />
  </div>
</template>

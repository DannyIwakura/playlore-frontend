<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../../services/api'
import PaginadorComponent from '../../../components/PaginadorComponent.vue'
import ModalConfirmacion from '../../../components/ModalConfirmacion.vue'
import ModalFormulario from '../../../components/ModalFormulario.vue'
import { enfocarPrimerError } from '../../../composables/useFocoPrimerError'
import TablaAdmin from '../components/TablaAdmin.vue'

interface Usuario {
  userId: number
  nombre: string
  email: string
  avatar: string | null
  rol: string
  fechaRegistro: string
  ultimaConexion: string
}

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`
const TAMANIO_PAGINA = 15

const columnas = [
  { etiqueta: 'Usuario' },
  { etiqueta: 'Rol' },
  { etiqueta: 'Registro' },
  { etiqueta: 'Última conexión' },
  { etiqueta: 'Acciones' },
]

const rolOpciones = [
  { value: 'USER', label: 'Usuario' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MOD', label: 'Moderador' },
]

const usuarios = ref<Usuario[]>([])
const paginaActual = ref(0)
const totalPaginas = ref(0)
const cargando = ref(false)
const error = ref('')
const feedback = ref<{ tipo: 'success' | 'danger'; texto: string } | null>(null)

const busqueda = ref('')
const filtroRol = ref('')

const usuarioEditando = ref<Usuario | null>(null)
const usuarioEliminando = ref<Usuario | null>(null)
const guardando = ref(false)
const eliminando = ref(false)
const erroresEdicion = ref<{ nombre?: string; email?: string; general?: string }>({})
const formEdicion = ref<HTMLElement | null>(null)

const hayFiltros = computed(() => busqueda.value.trim() !== '' || filtroRol.value !== '')

const usuariosFiltrados = computed(() => {
  const texto = normalizar(busqueda.value.trim())
  return usuarios.value.filter((usuario) => {
    if (filtroRol.value && usuario.rol !== filtroRol.value) return false
    if (!texto) return true
    return (
      normalizar(usuario.nombre).includes(texto) || normalizar(usuario.email).includes(texto)
    )
  })
})

const resumen = computed(() => {
  const total = usuarios.value.length
  if (!hayFiltros.value) {
    return `${total} ${total === 1 ? 'usuario' : 'usuarios'} en esta página`
  }
  return `${usuariosFiltrados.value.length} de ${total} usuarios en esta página`
})

const mensajeVacio = computed(() =>
  hayFiltros.value
    ? 'Ningún usuario de esta página coincide con la búsqueda.'
    : 'No hay usuarios registrados todavía.'
)

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return `${import.meta.env.VITE_API_URL}${avatar}`
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function etiquetaRol(rol: string): string {
  return rolOpciones.find((opcion) => opcion.value === rol)?.label ?? rol
}

function claseRol(rol: string): string {
  if (rol === 'ADMIN') return 'pl-status-pill pl-status-pill--danger'
  if (rol === 'MOD') return 'pl-status-pill pl-status-pill--warning'
  return 'pl-status-pill pl-status-pill--neutral'
}

function limpiarFiltros() {
  busqueda.value = ''
  filtroRol.value = ''
}

async function cargarUsuarios(pagina = 0) {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/usuarios', {
      params: { page: pagina, size: TAMANIO_PAGINA },
    })
    usuarios.value = data.content || []
    totalPaginas.value = data.totalPages || 0
    paginaActual.value = data.number || 0
  } catch {
    usuarios.value = []
    error.value = 'Error al cargar los usuarios.'
  } finally {
    cargando.value = false
  }
}

function abrirEditar(usuario: Usuario) {
  usuarioEditando.value = { ...usuario }
  erroresEdicion.value = {}
}

function cerrarEditar() {
  usuarioEditando.value = null
  erroresEdicion.value = {}
}

function limpiarError(campo: 'nombre' | 'email') {
  if (!erroresEdicion.value[campo]) return
  erroresEdicion.value = { ...erroresEdicion.value, [campo]: undefined }
}

function validarEdicion(): boolean {
  const errores: { nombre?: string; email?: string } = {}
  const nombre = usuarioEditando.value?.nombre.trim() ?? ''
  const email = usuarioEditando.value?.email.trim() ?? ''

  if (nombre.length < 2) errores.nombre = 'Escribe un nombre de al menos 2 caracteres.'
  if (!email) errores.email = 'Escribe el correo de la cuenta.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errores.email = 'Escribe un correo válido, por ejemplo nombre@dominio.com.'
  }

  erroresEdicion.value = errores
  return Object.keys(errores).length === 0
}

async function guardarEdicion() {
  const usuario = usuarioEditando.value
  if (!usuario || guardando.value) return
  if (!validarEdicion()) {
    await enfocarPrimerError(formEdicion.value)
    return
  }

  guardando.value = true
  erroresEdicion.value = {}
  try {
    const formData = new FormData()
    const datos = new Blob(
      [
        JSON.stringify({
          userId: usuario.userId,
          nombre: usuario.nombre.trim(),
          email: usuario.email.trim(),
          avatar: usuario.avatar,
          fechaRegistro: usuario.fechaRegistro,
          ultimaConexion: usuario.ultimaConexion,
        }),
      ],
      { type: 'application/json' }
    )
    formData.append('usuario', datos)

    await api.put(`/usuarios/${usuario.userId}`, formData)
    await api.put(`/usuarios/${usuario.userId}/rol`, null, { params: { rol: usuario.rol } })

    cerrarEditar()
    feedback.value = { tipo: 'success', texto: `Se guardaron los cambios de ${usuario.nombre}.` }
    await cargarUsuarios(paginaActual.value)
  } catch (e: any) {
    erroresEdicion.value = {
      general: e?.response?.data?.error || 'No se pudo guardar el usuario.',
    }
  } finally {
    guardando.value = false
  }
}

function pedirEliminar(usuario: Usuario) {
  usuarioEliminando.value = usuario
}

async function confirmarEliminar() {
  const usuario = usuarioEliminando.value
  if (!usuario || eliminando.value) return

  eliminando.value = true
  try {
    await api.delete(`/usuarios/${usuario.userId}`)
    usuarioEliminando.value = null
    feedback.value = { tipo: 'success', texto: `Se eliminó la cuenta de ${usuario.nombre}.` }
    await cargarUsuarios(paginaActual.value)
  } catch (e: any) {
    feedback.value = {
      tipo: 'danger',
      texto: e?.response?.data?.error || 'No se pudo eliminar el usuario.',
    }
  } finally {
    eliminando.value = false
  }
}

defineExpose({ cargarUsuarios })
onMounted(() => cargarUsuarios())
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
      titulo="Usuarios registrados"
      :columnas="columnas"
      :total="usuariosFiltrados.length"
      :cargando="cargando"
      :error="error"
      :vacio="mensajeVacio"
      :resumen="resumen"
    >
      <template #barra>
        <div class="pl-admin-barra">
          <div class="pl-admin-barra__campo">
            <label for="usuarios-buscar">Buscar</label>
            <input
              id="usuarios-buscar"
              v-model="busqueda"
              type="search"
              class="form-control"
              placeholder="Nombre o correo"
              autocomplete="off"
            />
          </div>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--corto">
            <label for="usuarios-rol">Rol</label>
            <select id="usuarios-rol" v-model="filtroRol" class="form-select">
              <option value="">Todos</option>
              <option v-for="opcion in rolOpciones" :key="opcion.value" :value="opcion.value">
                {{ opcion.label }}
              </option>
            </select>
          </div>
          <div class="pl-admin-barra__acciones">
            <button
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :disabled="!hayFiltros"
              @click="limpiarFiltros"
            >
              <i class="bi bi-eraser" aria-hidden="true"></i>
              Limpiar
            </button>
          </div>
          <p class="pl-admin-barra__nota">
            La búsqueda y el filtro de rol actúan sobre los usuarios de la página actual.
          </p>
        </div>
      </template>

      <tr v-for="usr in usuariosFiltrados" :key="usr.userId">
        <th scope="row">
          <div class="pl-tabla-admin__principal">
            <img class="pl-tabla-admin__avatar" :src="avatarUrl(usr.avatar)" alt="" />
            <div class="pl-tabla-admin__principal-texto">
              <strong>{{ usr.nombre }}</strong>
              <span class="pl-tabla-admin__secundario">#{{ usr.userId }} · {{ usr.email }}</span>
            </div>
          </div>
        </th>
        <td data-etiqueta="Rol">
          <span :class="claseRol(usr.rol)">{{ etiquetaRol(usr.rol) }}</span>
        </td>
        <td data-etiqueta="Registro" class="pl-tabla-admin__fecha">{{ formatFecha(usr.fechaRegistro) }}</td>
        <td data-etiqueta="Última conexión" class="pl-tabla-admin__fecha">
          {{ formatFecha(usr.ultimaConexion) }}
        </td>
        <td data-etiqueta="Acciones">
          <div class="pl-tabla-admin__acciones">
            <button
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Editar a ${usr.nombre}`"
              @click="abrirEditar(usr)"
            >
              <i class="bi bi-pencil" aria-hidden="true"></i>
              Editar
            </button>
            <button
              type="button"
              class="pl-btn pl-btn--danger-ghost pl-btn--sm"
              :aria-label="`Eliminar la cuenta de ${usr.nombre}`"
              @click="pedirEliminar(usr)"
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
          @cambiar="cargarUsuarios"
        />
      </template>
    </TablaAdmin>

    <ModalFormulario v-if="usuarioEditando" titulo="Editar usuario" ancho="md" @cerrar="cerrarEditar">
      <form ref="formEdicion" novalidate @submit.prevent="guardarEdicion">
        <div v-if="erroresEdicion.general" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span>{{ erroresEdicion.general }}</span>
        </div>

        <div class="pl-field">
          <label class="form-label" for="usuario-nombre">Nombre</label>
          <input
            id="usuario-nombre"
            v-model="usuarioEditando.nombre"
            type="text"
            class="form-control"
            maxlength="50"
            autocomplete="off"
            :aria-invalid="erroresEdicion.nombre ? 'true' : undefined"
            :aria-describedby="erroresEdicion.nombre ? 'usuario-nombre-error' : undefined"
            @input="limpiarError('nombre')"
          />
          <p v-if="erroresEdicion.nombre" id="usuario-nombre-error" class="pl-field__error">
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresEdicion.nombre }}
          </p>
        </div>

        <div class="pl-field">
          <label class="form-label" for="usuario-email">Correo</label>
          <input
            id="usuario-email"
            v-model="usuarioEditando.email"
            type="email"
            class="form-control"
            maxlength="120"
            autocomplete="off"
            :aria-invalid="erroresEdicion.email ? 'true' : undefined"
            :aria-describedby="erroresEdicion.email ? 'usuario-email-error' : undefined"
            @input="limpiarError('email')"
          />
          <p v-if="erroresEdicion.email" id="usuario-email-error" class="pl-field__error">
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresEdicion.email }}
          </p>
        </div>

        <div class="pl-field">
          <label class="form-label" for="usuario-rol">Rol</label>
          <select id="usuario-rol" v-model="usuarioEditando.rol" class="form-select">
            <option v-for="opcion in rolOpciones" :key="opcion.value" :value="opcion.value">
              {{ opcion.label }}
            </option>
          </select>
          <p class="pl-field__hint">El rol cambia los permisos de la cuenta al instante.</p>
        </div>

        <div class="pl-form-acciones">
          <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarEditar">Cancelar</button>
          <button type="submit" class="pl-btn pl-btn--primary" :disabled="guardando">
            <span v-if="guardando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-check-lg" aria-hidden="true"></i>
            {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </ModalFormulario>

    <ModalConfirmacion
      v-if="usuarioEliminando"
      :mensaje="`¿Eliminar la cuenta de ${usuarioEliminando.nombre}? Se borrarán sus datos y no se puede deshacer.`"
      titulo="Eliminar usuario"
      boton-confirmar="Eliminar"
      :peligro="true"
      @confirmar="confirmarEliminar"
      @cancelar="usuarioEliminando = null"
    />
  </div>
</template>

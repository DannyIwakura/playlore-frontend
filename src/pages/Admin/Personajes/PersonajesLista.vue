<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from '../../../services/api'
import PaginadorComponent from '../../../components/PaginadorComponent.vue'

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

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

const personajes = ref<Personaje[]>([])
const cargando = ref(false)
const error = ref('')

// Paginación
const paginaActual = ref(0)
const totalPaginas = ref(0)
const size = 10

// Filtro de búsqueda
const filtroNombre = ref('')

const cargarPersonajes = async (pagina = 0) => {
  cargando.value = true
  error.value = ''
  try {
    const params: Record<string, any> = { page: pagina, size }
    if (filtroNombre.value.trim()) params.nombre = filtroNombre.value.trim()

    const { data } = await axios.get('/personajes/buscar', { params })

    // Resolvemos el nombre de cada usuario por su id
    const personajesConNombre = await Promise.all(
      data.content.map(async (p: Personaje) => {
        try {
          const { data: usuario } = await axios.get(`/usuarios/${p.userId}`)
          return { ...p, nombreUsuario: usuario.nombre }
        } catch {
          return { ...p, nombreUsuario: null }
        }
      })
    )

    personajes.value = personajesConNombre
    totalPaginas.value = data.totalPages
    paginaActual.value = data.number
  } catch (e) {
    error.value = 'Error al cargar los personajes.'
  } finally {
    cargando.value = false
  }
}
const eliminarPersonaje = async (id: number) => {
  if (!confirm('¿Eliminar este personaje? Esta acción no se puede deshacer.')) return
  try {
    await axios.delete(`/personajes/${id}`)
    await cargarPersonajes(paginaActual.value)
  } catch (e) {
    alert('Error al eliminar el personaje.')
  }
}

const cambiarEstado = async (id: number, estadoActual: string | null) => {
  const nuevoEstado = estadoActual === 'ACTIVO' ? 'DESACTIVADO' : 'ACTIVO'
  try {
    await axios.put(`/personajes/admin/${id}/estado`, { estado: nuevoEstado })
    await cargarPersonajes(paginaActual.value)
  } catch (e) {
    alert('Error al cambiar el estado.')
  }
}

const avatarUrl = (avatar: string | null) => {
  const def = AVATAR_DEFECTO

  if (!avatar || avatar.includes('AVATAR.png')) {
    return def
  }

  if (avatar.startsWith('http')) {
    return avatar
  }

  return `${import.meta.env.VITE_API_URL}${avatar}`
}

onMounted(() => cargarPersonajes())
</script>

<template>
  <div>

    <!-- Buscador -->
    <div class="d-flex gap-2 mb-3">
      <input
        v-model="filtroNombre"
        type="text"
        class="form-control"
        placeholder="Buscar por nombre..."
        @keyup.enter="cargarPersonajes(0)"
      />
      <button class="btn btn-primary" @click="cargarPersonajes(0)">
        <i class="bi bi-search"></i> Buscar
      </button>
      <button class="btn btn-outline-secondary" @click="filtroNombre = ''; cargarPersonajes(0)">
        Limpiar
      </button>
    </div>

    <!-- Estado carga / error -->
    <div v-if="cargando" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- Tabla -->
    <div v-else>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead class="table-dark">
            <tr>
              <th>Avatar</th>
              <th>Nombre</th>
              <th>Propietario</th>
              <th>Raza</th>
              <th>Clase</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="personajes.length === 0">
              <td colspan="7" class="text-center text-muted py-4">No hay personajes.</td>
            </tr>
            <tr v-for="p in personajes" :key="p.idPersonaje">
              <td>
                <img
                  :src="avatarUrl(p.avatar)"
                  alt="avatar"
                  style="width:36px; height:36px; border-radius:50%; object-fit:cover;"
                />
              </td>
              <td>{{ p.nombre }}</td>
              <td>
                <span class="text-muted" style="font-size:0.85rem">
                  {{ p.nombreUsuario ?? `#${p.userId}` }}
                </span>
              </td>
              <td>{{ p.raza ?? '—' }}</td>
              <td>{{ p.clase ?? '—' }}</td>
              <td>
                <span
                  class="badge"
                  :class="p.estadoPersonaje === 'ACTIVO' ? 'bg-success' : 'bg-secondary'"
                >
                  {{ p.estadoPersonaje ?? '—' }}
                </span>
              </td>
              <td>
                <div class="d-flex gap-2">
                  <button
                    class="btn btn-sm"
                    :class="p.estadoPersonaje === 'ACTIVO' ? 'btn-warning' : 'btn-success'"
                    @click="cambiarEstado(p.idPersonaje, p.estadoPersonaje)"
                    :title="p.estadoPersonaje === 'ACTIVO' ? 'Suspender' : 'Activar'"
                  >
                    <i :class="p.estadoPersonaje === 'ACTIVO' ? 'bi bi-slash-circle' : 'bi bi-check-circle'"></i>
                  </button>
                  <router-link
                    :to="`/personaje/${p.idPersonaje}`"
                    class="btn btn-sm btn-outline-primary"
                    title="Ver perfil"
                  >
                    <i class="bi bi-eye"></i>
                  </router-link>
                  <button
                    class="btn btn-sm btn-danger"
                    @click="eliminarPersonaje(p.idPersonaje)"
                    title="Eliminar"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
           <PaginadorComponent
              :paginaActual="paginaActual"
              :totalPaginas="totalPaginas"
              @cambiar="cargarPersonajes"
            />
      </div>

      <!-- Paginación -->
      <nav v-if="totalPaginas > 1">
        <ul class="pagination pagination-sm justify-content-center">
          <li class="page-item" :class="{ disabled: paginaActual === 0 }">
            <button class="page-link" @click="cargarPersonajes(paginaActual - 1)">
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>
          <li
            v-for="p in totalPaginas"
            :key="p"
            class="page-item"
            :class="{ active: paginaActual === p - 1 }"
          >
            <button class="page-link" @click="cargarPersonajes(p - 1)">{{ p }}</button>
          </li>
          <li class="page-item" :class="{ disabled: paginaActual === totalPaginas - 1 }">
            <button class="page-link" @click="cargarPersonajes(paginaActual + 1)">
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>

  </div>
</template>
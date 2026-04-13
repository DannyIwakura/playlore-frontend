<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

interface Usuario {
  userId: number
  nombre: string
  email: string
  avatar: string
  rol: string
  fechaRegistro: string
  ultimaConexion: string
}

const usuarios = ref<Usuario[]>([])
const error = ref('')
const cargando = ref(false)

const usuarioEditando = ref<Usuario | null>(null)
const usuarioEliminando = ref<Usuario | null>(null)

const rolOpciones = [
  { value: 'USER', label: 'Usuario' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MOD', label: 'Moderador' },
]

const formatFecha = (fecha: string) => {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const BASE_URL = 'http://localhost:8080/api'

const cargarUsuarios = async () => {
  cargando.value = true
  error.value = ''
  try {
    const response = await axios.get(`${BASE_URL}/usuarios`, {
      headers: authHeader()
    })
    usuarios.value = response.data
  } catch (e) {
    error.value = 'Error al cargar los usuarios.'
  } finally {
    cargando.value = false
  }
}

// --- EDITAR ---
const abrirEditar = async (usuario: Usuario) => {
  usuarioEditando.value = { ...usuario }
  const { Modal } = await import('bootstrap')
  const modal = new Modal(document.getElementById('modalEditarUsuario')!)
  modal.show()
}

const guardarEdicion = async () => {
  if (!usuarioEditando.value) return
  try {
    await axios.put(
      `${BASE_URL}/usuarios/${usuarioEditando.value.userId}`,
      {
        userId: usuarioEditando.value.userId,
        nombre: usuarioEditando.value.nombre,
        email: usuarioEditando.value.email,
        rol: usuarioEditando.value.rol,
        avatar: usuarioEditando.value.avatar,
        fechaRegistro: usuarioEditando.value.fechaRegistro,
        ultimaConexion: usuarioEditando.value.ultimaConexion
      },
      { headers: authHeader() }
    )
    const { Modal } = await import('bootstrap')
    Modal.getInstance(document.getElementById('modalEditarUsuario')!)?.hide()
    await cargarUsuarios()
  } catch (e) {
    error.value = 'Error al editar el usuario.'
  }
}

// --- ELIMINAR ---
const abrirEliminar = async (usuario: Usuario) => {
  usuarioEliminando.value = usuario
  const { Modal } = await import('bootstrap')
  const modal = new Modal(document.getElementById('modalEliminarUsuario')!)
  modal.show()
}

const confirmarEliminar = async () => {
  if (!usuarioEliminando.value) return
  try {
    await axios.delete(
      `${BASE_URL}/usuarios/${usuarioEliminando.value.userId}`,
      { headers: authHeader() }
    )
    const { Modal } = await import('bootstrap')
    Modal.getInstance(document.getElementById('modalEliminarUsuario')!)?.hide()
    await cargarUsuarios()
  } catch (e) {
    error.value = 'Error al eliminar el usuario.'
  }
}

defineExpose({ cargarUsuarios })
onMounted(cargarUsuarios)
</script>

<template>
  <div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="cargando" class="text-muted">Cargando usuarios...</div>

    <!-- Tabla -->
    <table v-if="!cargando && usuarios.length" class="table table-striped align-middle">
      <thead class="table-dark">
        <tr>
          <th>#</th>
          <th>Avatar</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Registro</th>
          <th>Última conexión</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="usr in usuarios" :key="usr.userId">
          <td>{{ usr.userId }}</td>
          <td>
            <img
              :src="BASE_URL + usr.avatar"
              :alt="usr.nombre"
              style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;"
            />
          </td>
          <td>{{ usr.nombre }}</td>
          <td>{{ usr.email }}</td>
          <td>
            <span class="badge" :class="usr.rol === 'ADMIN' ? 'bg-danger' : 'bg-secondary'">
              {{ usr.rol === 'ADMIN' ? 'Administrador' : 'Usuario' }}
            </span>
          </td>
          <td>{{ formatFecha(usr.fechaRegistro) }}</td>
          <td>{{ formatFecha(usr.ultimaConexion) }}</td>
          <td class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" @click="abrirEditar(usr)">
              Editar
            </button>
            <button class="btn btn-sm btn-outline-danger" @click="abrirEliminar(usr)">
              Eliminar
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!cargando && !usuarios.length" class="text-muted">
      No hay usuarios registrados todavía.
    </p>

    <!-- Modal Editar -->
    <div class="modal fade" id="modalEditarUsuario" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar usuario</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="usuarioEditando">
            <div class="mb-3">
              <label class="form-label">Nombre</label>
              <input v-model="usuarioEditando.nombre" type="text" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input v-model="usuarioEditando.email" type="email" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Rol</label>
              <select v-model="usuarioEditando.rol" class="form-select">
                <option v-for="op in rolOpciones" :key="op.value" :value="op.value">
                  {{ op.label }}
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary" @click="guardarEdicion">Guardar cambios</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Eliminar -->
    <div class="modal fade" id="modalEliminarUsuario" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirmar eliminación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="usuarioEliminando">
            <p>¿Seguro que quieres eliminar al usuario <strong>{{ usuarioEliminando.nombre }}</strong>?</p>
            <p class="text-muted small">Esta acción no se puede deshacer.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-danger" @click="confirmarEliminar">Eliminar</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
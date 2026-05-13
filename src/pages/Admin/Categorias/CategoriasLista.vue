<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import PaginadorComponent from '../../../components/PaginadorComponent.vue'
import { computed } from 'vue'
import { Modal } from 'bootstrap'

interface Categoria {
  idCategoria: number
  nombre: string
  descripcion: string
  tipo: string
}
const hayCategorias = computed(() => Array.isArray(categorias.value) && categorias.value.length > 0)
const categorias = ref<Categoria[]>([])
const error = ref('')
const cargando = ref(false)
const paginaActual = ref(0)
const totalPaginas = ref(0)
const TAMANIO_PAGINA = 15

// Estado editar
const categoriaEditando = ref<Categoria | null>(null)

// Estado eliminar
const categoriaEliminando = ref<Categoria | null>(null)

const tipoOpciones = [
  { value: 'GENERO', label: 'Género' },
  { value: 'FANDOM', label: 'Fandom' },
  { value: 'SOBRE_EL_PERSONAJE', label: 'Sobre el personaje' },
  { value: 'TIPO_DE_ESCRITURA', label: 'Tipo de escritura' },
  { value: 'TIPO_DE_TRAMA', label: 'Tipo de trama' },
]

const tipoLabel = (valor: string) =>
  tipoOpciones.find(o => o.value === valor)?.label ?? valor

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const cargarCategorias = async (pagina = 0) => {
  cargando.value = true
  error.value = ''

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/categorias`,
      {
        headers: authHeader(),
        params: {
          page: pagina,
          size: TAMANIO_PAGINA
        }
      }
    )
    
    const data = response.data;
    if (data && Array.isArray(data.content)) {
        categorias.value = [...data.content]; // Usa el spread operator para asegurar una nueva referencia
        totalPaginas.value = data.totalPages;
        paginaActual.value = data.number;
      } else {
        categorias.value = [];
    }
    console.log('RESPUESTA RAW:', response.data)
    categorias.value = response.data?.content ?? []
    totalPaginas.value = response.data?.totalPages ?? 0
    paginaActual.value = response.data?.number ?? 0
    
  } catch (e) {
    console.error(e)
    error.value = 'Error al cargar las categorías.'

  } finally {
    cargando.value = false
  }
}

// --- EDITAR ---
const abrirEditar = async (categoria: Categoria) => {
  categoriaEditando.value = { ...categoria }
  const modalEl = document.getElementById('modalEditarCategoria')
  if (modalEl) {
    const modal = new Modal(modalEl)
    modal.show()
  }
}

const guardarEdicion = async () => {
  if (!categoriaEditando.value) return
  try {
    await axios.put(
      `${import.meta.env.VITE_API_URL}/categorias/${categoriaEditando.value.idCategoria}`,
      {
        nombre: categoriaEditando.value.nombre,
        descripcion: categoriaEditando.value.descripcion,
        tipo: categoriaEditando.value.tipo
      },
      { headers: authHeader() }
    )
    const { Modal } = await import('bootstrap')
    const modalEl = document.getElementById('modalEditarCategoria')!
    Modal.getInstance(modalEl)?.hide()
    await cargarCategorias()
  } catch (e) {
    error.value = 'Error al editar la categoría.'
  }
}

// --- ELIMINAR ---
const abrirEliminar = async (categoria: Categoria) => {
  categoriaEliminando.value = categoria
  const { Modal } = await import('bootstrap')
  const modal = new Modal(document.getElementById('modalEliminarCategoria')!)
  modal.show()
}

const confirmarEliminar = async () => {
  if (!categoriaEliminando.value) return
  try {
    await axios.delete(
      `${import.meta.env.VITE_API_URL}/categorias/${categoriaEliminando.value.idCategoria}`,
      { headers: authHeader() }
    )
    const { Modal } = await import('bootstrap')
    const modalEl = document.getElementById('modalEliminarCategoria')!
    Modal.getInstance(modalEl)?.hide()
    await cargarCategorias()
  } catch (e) {
    error.value = 'Error al eliminar la categoría.'
  }
}

defineExpose({ cargarCategorias })
onMounted(cargarCategorias)
</script>

<template>
  <div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="cargando" class="text-muted">Cargando categorías...</div>

    <!-- Tabla -->
    <table v-if="!cargando && hayCategorias"  class="table table-striped align-middle">
      <thead class="table-dark">
        <tr>
          <th>#</th>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Tipo</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cat in categorias" :key="cat.idCategoria">
          <td>{{ cat.idCategoria }}</td>
          <td>{{ cat.nombre }}</td>
          <td>{{ cat.descripcion }}</td>
          <td><span class="badge bg-secondary">{{ tipoLabel(cat.tipo) }}</span></td>
          <td class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" @click="abrirEditar(cat)">
              Editar
            </button>
            <button class="btn btn-sm btn-outline-danger" @click="abrirEliminar(cat)">
              Eliminar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <PaginadorComponent
      :paginaActual="paginaActual"
      :totalPaginas="totalPaginas"
      @cambiar="cargarCategorias"
    />
    <p v-if="!cargando && !hayCategorias" class="text-muted">
      No hay categorías creadas todavía.
    </p>

    <!-- Modal Editar -->
    <div class="modal fade" id="modalEditarCategoria" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar categoría</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="categoriaEditando">
            <div class="mb-3">
              <label class="form-label">Nombre</label>
              <input v-model="categoriaEditando.nombre" type="text" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Descripción</label>
              <textarea v-model="categoriaEditando.descripcion" class="form-control" rows="3"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">Tipo</label>
              <select v-model="categoriaEditando.tipo" class="form-select">
                <option v-for="op in tipoOpciones" :key="op.value" :value="op.value">
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
    <div class="modal fade" id="modalEliminarCategoria" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirmar eliminación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="categoriaEliminando">
            <p>¿Seguro que quieres eliminar la categoría <strong>{{ categoriaEliminando.nombre }}</strong>?</p>
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
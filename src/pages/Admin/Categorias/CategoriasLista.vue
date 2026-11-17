<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../../services/api'
import PaginadorComponent from '../../../components/PaginadorComponent.vue'
import ModalConfirmacion from '../../../components/ModalConfirmacion.vue'
import ModalFormulario from '../../../components/ModalFormulario.vue'
import { enfocarPrimerError } from '../../../composables/useFocoPrimerError'
import TablaAdmin from '../components/TablaAdmin.vue'
import {
  DESCRIPCION_MAX,
  NOMBRE_MAX,
  TIPOS_CATEGORIA,
  etiquetaTipoCategoria,
  validarCategoria,
  type ErroresCategoria,
} from './categorias'

interface Categoria {
  idCategoria: number
  nombre: string
  descripcion: string
  tipo: string
}

const TAMANIO_PAGINA = 15

const columnas = [
  { etiqueta: 'Categoría' },
  { etiqueta: 'Tipo' },
  { etiqueta: 'Descripción' },
  { etiqueta: 'Acciones' },
]

const categorias = ref<Categoria[]>([])
const paginaActual = ref(0)
const totalPaginas = ref(0)
const cargando = ref(false)
const error = ref('')
const feedback = ref<{ tipo: 'success' | 'danger'; texto: string } | null>(null)

const busqueda = ref('')
const filtroTipo = ref('')

const categoriaEditando = ref<Categoria | null>(null)
const formEdicion = ref<HTMLElement | null>(null)
const erroresEdicion = ref<ErroresCategoria & { general?: string }>({})
const guardando = ref(false)

const categoriaEliminando = ref<Categoria | null>(null)
const eliminando = ref(false)

const hayFiltros = computed(() => busqueda.value.trim() !== '' || filtroTipo.value !== '')

const categoriasFiltradas = computed(() => {
  const texto = normalizar(busqueda.value.trim())
  return categorias.value.filter((categoria) => {
    if (filtroTipo.value && categoria.tipo !== filtroTipo.value) return false
    if (!texto) return true
    return (
      normalizar(categoria.nombre).includes(texto) ||
      normalizar(categoria.descripcion ?? '').includes(texto)
    )
  })
})

const resumen = computed(() => {
  const total = categorias.value.length
  if (!hayFiltros.value) {
    return `${total} ${total === 1 ? 'categoría' : 'categorías'} en esta página`
  }
  return `${categoriasFiltradas.value.length} de ${total} categorías en esta página`
})

const mensajeVacio = computed(() =>
  hayFiltros.value
    ? 'Ninguna categoría de esta página coincide con los filtros aplicados.'
    : 'Todavía no hay categorías creadas.'
)

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function limpiarFiltros() {
  busqueda.value = ''
  filtroTipo.value = ''
}

async function cargarCategorias(pagina = 0) {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/categorias', {
      params: { page: pagina, size: TAMANIO_PAGINA },
    })
    categorias.value = Array.isArray(data?.content) ? data.content : []
    totalPaginas.value = data?.totalPages ?? 0
    paginaActual.value = data?.number ?? 0
  } catch {
    categorias.value = []
    error.value = 'Error al cargar las categorías.'
  } finally {
    cargando.value = false
  }
}

function abrirEditar(categoria: Categoria) {
  categoriaEditando.value = { ...categoria }
  erroresEdicion.value = {}
}

function cerrarEditar() {
  categoriaEditando.value = null
  erroresEdicion.value = {}
}

function limpiarError(campo: 'nombre' | 'descripcion') {
  if (!erroresEdicion.value[campo]) return
  erroresEdicion.value = { ...erroresEdicion.value, [campo]: undefined }
}

// El backend responde 400 con `{campo: mensaje}` en las validaciones; se
// reparte por campo y lo que no encaje se anuncia como error general.
function repartirErrores(data: unknown): ErroresCategoria & { general?: string } {
  if (!data || typeof data !== 'object') {
    return { general: 'No se pudo guardar la categoría.' }
  }
  const cuerpo = data as Record<string, unknown>
  const errores: ErroresCategoria & { general?: string } = {}
  if (typeof cuerpo.nombre === 'string') errores.nombre = cuerpo.nombre
  if (typeof cuerpo.descripcion === 'string') errores.descripcion = cuerpo.descripcion
  if (!errores.nombre && !errores.descripcion) {
    errores.general =
      typeof cuerpo.error === 'string' ? cuerpo.error : 'No se pudo guardar la categoría.'
  }
  return errores
}

async function guardarEdicion() {
  const categoria = categoriaEditando.value
  if (!categoria || guardando.value) return

  const errores = validarCategoria(categoria.nombre, categoria.descripcion ?? '')
  if (Object.keys(errores).length > 0) {
    erroresEdicion.value = errores
    await enfocarPrimerError(formEdicion.value)
    return
  }

  guardando.value = true
  erroresEdicion.value = {}
  const nombre = categoria.nombre.trim()
  try {
    await api.put(`/categorias/${categoria.idCategoria}`, {
      nombre,
      descripcion: categoria.descripcion?.trim() ?? '',
      tipo: categoria.tipo,
    })
    cerrarEditar()
    feedback.value = { tipo: 'success', texto: `Se guardaron los cambios de ${nombre}.` }
    await cargarCategorias(paginaActual.value)
  } catch (e: any) {
    erroresEdicion.value = repartirErrores(e?.response?.data)
    if (erroresEdicion.value.nombre || erroresEdicion.value.descripcion) {
      await enfocarPrimerError(formEdicion.value)
    }
  } finally {
    guardando.value = false
  }
}

function pedirEliminar(categoria: Categoria) {
  categoriaEliminando.value = categoria
}

async function confirmarEliminar() {
  const categoria = categoriaEliminando.value
  if (!categoria || eliminando.value) return

  categoriaEliminando.value = null
  eliminando.value = true
  try {
    await api.delete(`/categorias/${categoria.idCategoria}`)
    feedback.value = { tipo: 'success', texto: `Se eliminó la categoría ${categoria.nombre}.` }
    // Si era la última de la página, retrocede para no dejar una página vacía.
    const pagina =
      categorias.value.length === 1 && paginaActual.value > 0
        ? paginaActual.value - 1
        : paginaActual.value
    await cargarCategorias(pagina)
  } catch (e: any) {
    feedback.value = {
      tipo: 'danger',
      texto: e?.response?.data?.error || 'No se pudo eliminar la categoría.',
    }
  } finally {
    eliminando.value = false
  }
}

// Tras crear, la categoría nueva queda al final del listado: se salta a la
// última página para que el alta se vea confirmada con la fila delante.
async function anunciarCreada(nombre: string) {
  feedback.value = { tipo: 'success', texto: `Se creó la categoría ${nombre}.` }
  await cargarCategorias(0)
  const ultima = Math.max(totalPaginas.value - 1, 0)
  if (ultima > 0) await cargarCategorias(ultima)
}

defineExpose({ cargarCategorias, anunciarCreada })
onMounted(() => cargarCategorias())
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
      titulo="Categorías de personaje"
      :columnas="columnas"
      :total="categoriasFiltradas.length"
      :cargando="cargando"
      :error="error"
      :vacio="mensajeVacio"
      :resumen="resumen"
    >
      <template #barra>
        <div class="pl-admin-barra">
          <div class="pl-admin-barra__campo">
            <label for="categorias-buscar">Buscar</label>
            <input
              id="categorias-buscar"
              v-model="busqueda"
              type="search"
              class="form-control"
              placeholder="Nombre o descripción"
              autocomplete="off"
            />
          </div>
          <div class="pl-admin-barra__campo pl-admin-barra__campo--corto">
            <label for="categorias-tipo">Tipo</label>
            <select id="categorias-tipo" v-model="filtroTipo" class="form-select">
              <option value="">Todos</option>
              <option v-for="opcion in TIPOS_CATEGORIA" :key="opcion.value" :value="opcion.value">
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
            La búsqueda y el filtro de tipo actúan sobre las categorías de la página actual.
          </p>
        </div>
      </template>

      <tr v-for="cat in categoriasFiltradas" :key="cat.idCategoria">
        <th scope="row">
          <div class="pl-tabla-admin__principal-texto">
            <strong>{{ cat.nombre }}</strong>
            <span class="pl-tabla-admin__secundario">#{{ cat.idCategoria }}</span>
          </div>
        </th>
        <td data-etiqueta="Tipo">
          <span class="pl-status-pill pl-status-pill--info">{{ etiquetaTipoCategoria(cat.tipo) }}</span>
        </td>
        <td data-etiqueta="Descripción">
          <span v-if="cat.descripcion" class="pl-tabla-admin__clamp">{{ cat.descripcion }}</span>
          <span v-else class="pl-tabla-admin__secundario">Sin descripción</span>
        </td>
        <td data-etiqueta="Acciones">
          <div class="pl-tabla-admin__acciones">
            <button
              type="button"
              class="pl-btn pl-btn--secondary pl-btn--sm"
              :aria-label="`Editar la categoría ${cat.nombre}`"
              @click="abrirEditar(cat)"
            >
              <i class="bi bi-pencil" aria-hidden="true"></i>
              Editar
            </button>
            <button
              type="button"
              class="pl-btn pl-btn--danger-ghost pl-btn--sm"
              :aria-label="`Eliminar la categoría ${cat.nombre}`"
              @click="pedirEliminar(cat)"
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
          @cambiar="cargarCategorias"
        />
      </template>
    </TablaAdmin>

    <ModalFormulario
      v-if="categoriaEditando"
      titulo="Editar categoría"
      ancho="md"
      @cerrar="cerrarEditar"
    >
      <form ref="formEdicion" novalidate @submit.prevent="guardarEdicion">
        <div v-if="erroresEdicion.general" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span>{{ erroresEdicion.general }}</span>
        </div>

        <div class="pl-field">
          <label class="form-label" for="categoria-nombre">
            Nombre <span class="text-danger" aria-hidden="true">*</span>
          </label>
          <input
            id="categoria-nombre"
            v-model="categoriaEditando.nombre"
            type="text"
            class="form-control"
            :maxlength="NOMBRE_MAX"
            autocomplete="off"
            required
            :aria-invalid="erroresEdicion.nombre ? 'true' : undefined"
            :aria-describedby="erroresEdicion.nombre ? 'categoria-nombre-error' : undefined"
            @input="limpiarError('nombre')"
          />
          <p v-if="erroresEdicion.nombre" id="categoria-nombre-error" class="pl-field__error">
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresEdicion.nombre }}
          </p>
        </div>

        <div class="pl-field">
          <label class="form-label" for="categoria-descripcion">Descripción</label>
          <textarea
            id="categoria-descripcion"
            v-model="categoriaEditando.descripcion"
            class="form-control"
            rows="3"
            :maxlength="DESCRIPCION_MAX"
            :aria-invalid="erroresEdicion.descripcion ? 'true' : undefined"
            :aria-describedby="erroresEdicion.descripcion ? 'categoria-descripcion-error' : undefined"
            @input="limpiarError('descripcion')"
          ></textarea>
          <p v-if="erroresEdicion.descripcion" id="categoria-descripcion-error" class="pl-field__error">
            <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresEdicion.descripcion }}
          </p>
        </div>

        <div class="pl-field">
          <label class="form-label" for="categoria-tipo">Tipo</label>
          <select id="categoria-tipo" v-model="categoriaEditando.tipo" class="form-select">
            <option v-for="opcion in TIPOS_CATEGORIA" :key="opcion.value" :value="opcion.value">
              {{ opcion.label }}
            </option>
          </select>
          <p class="pl-field__hint">El tipo agrupa la categoría en el perfil del personaje.</p>
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
      v-if="categoriaEliminando"
      :mensaje="`¿Eliminar la categoría ${categoriaEliminando.nombre}? Esta acción no se puede deshacer.`"
      titulo="Eliminar categoría"
      boton-confirmar="Eliminar"
      :peligro="true"
      @confirmar="confirmarEliminar"
      @cancelar="categoriaEliminando = null"
    />
  </div>
</template>

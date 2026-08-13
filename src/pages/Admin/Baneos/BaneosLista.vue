<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from '../../../services/api'
import ModalAviso from '../../../components/ModalAviso.vue'
import ModalConfirmacion from '../../../components/ModalConfirmacion.vue'

interface Baneo {
  idBaneoGlobal: number
  tipo: 'USUARIO' | 'PERSONAJE'
  idObjetivo: number
  nombreObjetivo: string
  motivo: string | null
  baneadoPorNombre: string | null
  fechaBaneo: string
  fechaExpiracion: string | null
  activo: boolean
}

const baneos = ref<Baneo[]>([])
const cargando = ref(false)
const error = ref('')

const formTipo = ref<'USUARIO' | 'PERSONAJE'>('USUARIO')
const formId = ref<number | null>(null)
const formDuracion = ref('PERMANENTE')
const formMotivo = ref('')
const creando = ref(false)
const errorCrear = ref('')

const opcionesDuracion = [
  { value: '1H', label: '1 hora' },
  { value: '24H', label: '24 horas' },
  { value: '7D', label: '7 días' },
  { value: 'PERMANENTE', label: 'Permanente' },
]

const aviso = ref<string | null>(null)
const confirmacion = ref<{ mensaje: string; ejecutar: () => void } | null>(null)

const cargarBaneos = async () => {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await axios.get('/moderacion/baneos')
    baneos.value = data
  } catch (e) {
    error.value = 'Error al cargar los baneos.'
  } finally {
    cargando.value = false
  }
}

const crearBaneo = async () => {
  errorCrear.value = ''
  if (!formId.value) {
    errorCrear.value = 'El id del objetivo es obligatorio.'
    return
  }
  creando.value = true
  try {
    await axios.post('/moderacion/baneos', {
      tipo: formTipo.value,
      id: formId.value,
      duracion: formDuracion.value,
      motivo: formMotivo.value || null,
    })
    formId.value = null
    formMotivo.value = ''
    formDuracion.value = 'PERMANENTE'
    await cargarBaneos()
  } catch (e: any) {
    const data = e?.response?.data
    errorCrear.value = data?.error || data?.message || 'Error al crear el baneo.'
  } finally {
    creando.value = false
  }
}

const desbanear = (b: Baneo) => {
  confirmacion.value = {
    mensaje: `¿Eliminar el baneo de ${b.nombreObjetivo}?`,
    ejecutar: async () => {
      try {
        await axios.delete(`/moderacion/baneos/${b.idBaneoGlobal}`)
        await cargarBaneos()
      } catch {
        aviso.value = 'Error al eliminar el baneo.'
      }
    },
  }
}

const fechaLegible = (f: string | null) => {
  if (!f) return '—'
  return new Date(f).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

onMounted(() => cargarBaneos())
</script>

<template>
  <div>
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h5 class="card-title mb-3">Nuevo baneo global</h5>
        <div class="row g-2">
          <div class="col-md-2">
            <select v-model="formTipo" class="form-select form-select-sm">
              <option value="USUARIO">Usuario</option>
              <option value="PERSONAJE">Personaje</option>
            </select>
          </div>
          <div class="col-md-2">
            <input v-model.number="formId" type="number" min="1" class="form-control form-control-sm" placeholder="ID" />
          </div>
          <div class="col-md-3">
            <select v-model="formDuracion" class="form-select form-select-sm">
              <option v-for="op in opcionesDuracion" :key="op.value" :value="op.value">
                {{ op.label }}
              </option>
            </select>
          </div>
          <div class="col-md-3">
            <input v-model="formMotivo" type="text" class="form-control form-control-sm" placeholder="Motivo (opcional)" />
          </div>
          <div class="col-md-2">
            <button class="btn btn-danger btn-sm w-100" :disabled="creando" @click="crearBaneo">
              <i class="bi bi-hammer me-1"></i> Banear
            </button>
          </div>
        </div>
        <div v-if="errorCrear" class="alert alert-danger py-1 small mt-2 mb-0">{{ errorCrear }}</div>
      </div>
    </div>

    <div v-if="cargando" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-dark">
          <tr>
            <th>Objetivo</th>
            <th>Tipo</th>
            <th>Motivo</th>
            <th>Baneado por</th>
            <th>Fecha</th>
            <th>Vencimiento</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="baneos.length === 0">
            <td colspan="8" class="text-center text-muted py-4">No hay baneos registrados.</td>
          </tr>
          <tr v-for="b in baneos" :key="b.idBaneoGlobal">
            <td>
              <strong>{{ b.nombreObjetivo }}</strong>
              <span class="text-muted" style="font-size:0.8rem"> (#{{ b.idObjetivo }})</span>
            </td>
            <td>
              <span class="badge bg-info text-dark">{{ b.tipo }}</span>
            </td>
            <td style="max-width:200px">
              <span v-if="b.motivo" class="text-truncate d-block">{{ b.motivo }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>{{ b.baneadoPorNombre ?? '—' }}</td>
            <td style="white-space:nowrap">
              <span style="font-size:0.85rem">{{ fechaLegible(b.fechaBaneo) }}</span>
            </td>
            <td style="white-space:nowrap">
              <span style="font-size:0.85rem">{{ fechaLegible(b.fechaExpiracion) }}</span>
            </td>
            <td>
              <span class="badge" :class="b.activo ? 'bg-danger' : 'bg-secondary'">
                {{ b.activo ? 'Activo' : 'Expirado' }}
              </span>
            </td>
            <td>
              <button v-if="b.activo" class="btn btn-sm btn-outline-success" @click="desbanear(b)" title="Desbanear">
                <i class="bi bi-unlock"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal: Confirmación -->
  <ModalConfirmacion
    v-if="confirmacion"
    :mensaje="confirmacion.mensaje"
    titulo="Desbanear"
    boton-confirmar="Eliminar"
    :peligro="true"
    @confirmar="confirmacion.ejecutar(); confirmacion = null"
    @cancelar="confirmacion = null"
  />

  <!-- Modal: Aviso -->
  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

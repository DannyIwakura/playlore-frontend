<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from '../../../services/api'

interface RegistroAuditoria {
  idRegistro: number
  accion: 'BANEO_CUENTA' | 'BANEO_PERSONAJE' | 'DESBANEO' | 'DENUNCIA_RESUELTA'
  moderadorId: number | null
  moderadorNombre: string | null
  objetivoUsuarioId: number | null
  objetivoUsuarioNombre: string | null
  objetivoPersonajeId: number | null
  objetivoPersonajeNombre: string | null
  motivo: string | null
  detalle: string | null
  fecha: string
}

const etiquetasAccion: Record<RegistroAuditoria['accion'], { label: string; clase: string }> = {
  BANEO_CUENTA: { label: 'Baneo de cuenta', clase: 'bg-danger' },
  BANEO_PERSONAJE: { label: 'Baneo de personaje', clase: 'bg-warning text-dark' },
  DESBANEO: { label: 'Desbaneo', clase: 'bg-success' },
  DENUNCIA_RESUELTA: { label: 'Denuncia resuelta', clase: 'bg-info text-dark' },
}

const registros = ref<RegistroAuditoria[]>([])
const cargando = ref(false)
const error = ref('')
const filtroAccion = ref('')

const cargarAuditoria = async () => {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await axios.get('/moderacion/auditoria')
    registros.value = data
  } catch {
    error.value = 'Error al cargar la auditoría de moderación.'
  } finally {
    cargando.value = false
  }
}

const registrosFiltrados = () => {
  if (!filtroAccion.value) return registros.value
  return registros.value.filter((r) => r.accion === filtroAccion.value)
}

const nombreObjetivo = (r: RegistroAuditoria) =>
  r.objetivoUsuarioNombre ?? r.objetivoPersonajeNombre ?? '—'

const fechaLegible = (f: string) =>
  new Date(f).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })

onMounted(() => cargarAuditoria())
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <button class="btn btn-sm btn-outline-primary" :disabled="cargando" @click="cargarAuditoria">
          <i class="bi bi-arrow-clockwise me-1"></i> Refrescar
        </button>
      </div>
      <div class="col-md-3">
        <select v-model="filtroAccion" class="form-select form-select-sm">
          <option value="">Todas las acciones</option>
          <option v-for="(meta, clave) in etiquetasAccion" :key="clave" :value="clave">
            {{ meta.label }}
          </option>
        </select>
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
            <th>Acción</th>
            <th>Objetivo</th>
            <th>Moderador</th>
            <th>Motivo</th>
            <th>Detalle</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="registrosFiltrados().length === 0">
            <td colspan="6" class="text-center text-muted py-4">No hay registros de moderación.</td>
          </tr>
          <tr v-for="r in registrosFiltrados()" :key="r.idRegistro">
            <td>
              <span class="badge" :class="etiquetasAccion[r.accion].clase">
                {{ etiquetasAccion[r.accion].label }}
              </span>
            </td>
            <td>
              <strong>{{ nombreObjetivo(r) }}</strong>
              <span
                v-if="r.objetivoUsuarioId !== null || r.objetivoPersonajeId !== null"
                class="text-muted"
                style="font-size:0.8rem"
              >
                (#{{ r.objetivoUsuarioId ?? r.objetivoPersonajeId }})
              </span>
            </td>
            <td>{{ r.moderadorNombre ?? '—' }}</td>
            <td style="max-width:180px">
              <span v-if="r.motivo" class="text-truncate d-block" :title="r.motivo">{{ r.motivo }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td style="max-width:220px">
              <span v-if="r.detalle" class="text-truncate d-block" :title="r.detalle">{{ r.detalle }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td style="white-space:nowrap">
              <span style="font-size:0.85rem">{{ fechaLegible(r.fecha) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

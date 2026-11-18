<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../../services/api'
import TablaAdmin from '../components/TablaAdmin.vue'

interface RegistroAuditoria {
  idRegistro: number
  accion:
    | 'BANEO_CUENTA'
    | 'BANEO_PERSONAJE'
    | 'DESBANEO'
    | 'DENUNCIA_RESUELTA'
    | 'CANAL_SUSPENDIDO'
    | 'CANAL_RESTAURADO'
    | 'CANAL_ELIMINADO'
    | 'CANAL_ACCESO_MODERADOR'
    | 'CANAL_OFICIAL_CREADO'
    | 'CANAL_MARCADO_OFICIAL'
    | 'CANAL_DESMARCADO_OFICIAL'
  moderadorId: number | null
  moderadorNombre: string | null
  objetivoUsuarioId: number | null
  objetivoUsuarioNombre: string | null
  objetivoPersonajeId: number | null
  objetivoPersonajeNombre: string | null
  objetivoCanalId: number | null
  objetivoCanalNombre: string | null
  motivo: string | null
  detalle: string | null
  fecha: string
}

const etiquetasAccion: Record<
  RegistroAuditoria['accion'],
  { label: string; clase: string }
> = {
  BANEO_CUENTA: { label: 'Baneo de cuenta', clase: 'pl-status-pill pl-status-pill--danger' },
  BANEO_PERSONAJE: { label: 'Baneo de personaje', clase: 'pl-status-pill pl-status-pill--warning' },
  DESBANEO: { label: 'Desbaneo', clase: 'pl-status-pill' },
  DENUNCIA_RESUELTA: { label: 'Denuncia resuelta', clase: 'pl-status-pill pl-status-pill--info' },
  CANAL_SUSPENDIDO: {
    label: 'Canal suspendido',
    clase: 'pl-status-pill pl-status-pill--warning',
  },
  CANAL_RESTAURADO: { label: 'Canal restaurado', clase: 'pl-status-pill pl-status-pill--info' },
  CANAL_ELIMINADO: { label: 'Canal eliminado', clase: 'pl-status-pill pl-status-pill--danger' },
  CANAL_ACCESO_MODERADOR: {
    label: 'Acceso de moderación a privado',
    clase: 'pl-status-pill pl-status-pill--info',
  },
  CANAL_OFICIAL_CREADO: {
    label: 'Canal oficial creado',
    clase: 'pl-status-pill pl-status-pill--info',
  },
  CANAL_MARCADO_OFICIAL: {
    label: 'Canal marcado como oficial',
    clase: 'pl-status-pill pl-status-pill--warning',
  },
  CANAL_DESMARCADO_OFICIAL: {
    label: 'Canal desmarcado como oficial',
    clase: 'pl-status-pill',
  },
}

const columnas = [
  { etiqueta: 'Acción' },
  { etiqueta: 'Objetivo' },
  { etiqueta: 'Moderador' },
  { etiqueta: 'Motivo' },
  { etiqueta: 'Fecha' },
]

const registros = ref<RegistroAuditoria[]>([])
const cargando = ref(false)
const error = ref('')

const busqueda = ref('')
const filtroAccion = ref('')

const hayFiltros = computed(() => busqueda.value.trim() !== '' || filtroAccion.value !== '')

const registrosFiltrados = computed(() => {
  const texto = normalizar(busqueda.value.trim())
  return registros.value.filter((registro) => {
    if (filtroAccion.value && registro.accion !== filtroAccion.value) return false
    if (!texto) return true
    return (
      normalizar(nombreObjetivo(registro)).includes(texto) ||
      normalizar(registro.moderadorNombre ?? '').includes(texto) ||
      normalizar(registro.motivo ?? '').includes(texto) ||
      normalizar(registro.detalle ?? '').includes(texto)
    )
  })
})

const resumen = computed(() => {
  const total = registros.value.length
  if (hayFiltros.value) return `${registrosFiltrados.value.length} de ${total} registros`
  return `${total} ${total === 1 ? 'registro' : 'registros'} · más recientes primero`
})

const mensajeVacio = computed(() =>
  hayFiltros.value
    ? 'Ningún registro coincide con los filtros aplicados.'
    : 'Todavía no hay acciones de moderación registradas.'
)

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function nombreObjetivo(registro: RegistroAuditoria): string {
  return (
    registro.objetivoUsuarioNombre ??
    registro.objetivoPersonajeNombre ??
    registro.objetivoCanalNombre ??
    '—'
  )
}

function idObjetivo(registro: RegistroAuditoria): number | null {
  return registro.objetivoUsuarioId ?? registro.objetivoPersonajeId ?? registro.objetivoCanalId
}

function tipoObjetivo(registro: RegistroAuditoria): string | null {
  if (registro.objetivoUsuarioId !== null) return 'Cuenta'
  if (registro.objetivoPersonajeId !== null) return 'Personaje'
  if (registro.objetivoCanalId !== null) return 'Canal'
  return null
}

function fechaLegible(fecha: string): string {
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function limpiarFiltros() {
  busqueda.value = ''
  filtroAccion.value = ''
}

async function cargarAuditoria() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/moderacion/auditoria')
    registros.value = Array.isArray(data) ? data : []
  } catch {
    registros.value = []
    error.value = 'Error al cargar la auditoría de moderación.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => cargarAuditoria())
</script>

<template>
  <TablaAdmin
    titulo="Auditoría de moderación"
    :columnas="columnas"
    :total="registrosFiltrados.length"
    :cargando="cargando"
    :error="error"
    :vacio="mensajeVacio"
    :resumen="resumen"
  >
    <template #barra>
      <div class="pl-admin-barra" role="search" aria-label="Filtros de la tabla">
        <div class="pl-admin-barra__campo">
          <label for="auditoria-buscar">Buscar</label>
          <input
            id="auditoria-buscar"
            v-model="busqueda"
            type="search"
            class="form-control"
            placeholder="Objetivo, moderador o motivo"
            autocomplete="off"
          />
        </div>
        <div class="pl-admin-barra__campo pl-admin-barra__campo--corto">
          <label for="auditoria-accion">Acción</label>
          <select id="auditoria-accion" v-model="filtroAccion" class="form-select">
            <option value="">Todas</option>
            <option v-for="(meta, clave) in etiquetasAccion" :key="clave" :value="clave">
              {{ meta.label }}
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
          <button
            type="button"
            class="pl-btn pl-btn--secondary pl-btn--sm"
            :disabled="cargando"
            @click="cargarAuditoria"
          >
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Refrescar
          </button>
        </div>
        <p class="pl-admin-barra__nota">
          Los filtros actúan sobre el historial completo, que llega ordenado del más reciente al más antiguo.
        </p>
      </div>
    </template>

    <tr v-for="registro in registrosFiltrados" :key="registro.idRegistro">
      <th scope="row">
        <span :class="etiquetasAccion[registro.accion].clase">
          {{ etiquetasAccion[registro.accion].label }}
        </span>
      </th>
      <td data-etiqueta="Objetivo">
        <strong>{{ nombreObjetivo(registro) }}</strong>
        <span v-if="idObjetivo(registro) !== null" class="pl-tabla-admin__secundario">
          {{ tipoObjetivo(registro) }} #{{ idObjetivo(registro) }}
        </span>
      </td>
      <td data-etiqueta="Moderador">{{ registro.moderadorNombre ?? '—' }}</td>
      <td data-etiqueta="Motivo">
        <span v-if="registro.motivo" class="pl-tabla-admin__clamp">{{ registro.motivo }}</span>
        <span v-else class="pl-tabla-admin__secundario">Sin motivo</span>
        <span v-if="registro.detalle" class="pl-tabla-admin__secundario">{{ registro.detalle }}</span>
      </td>
      <td data-etiqueta="Fecha" class="pl-tabla-admin__fecha">{{ fechaLegible(registro.fecha) }}</td>
    </tr>
  </TablaAdmin>
</template>

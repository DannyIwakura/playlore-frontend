<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { chatApi } from '../../services/chatApi'
import { canalAvatar, formatFecha } from './chatUtils'

const props = defineProps<{
  msg: any
}>()

const emit = defineEmits<{
  unirse: [canalId: number]
  resuelta: [estado: string]
  error: [texto: string]
}>()

const invitacion = computed(() => props.msg?.invitacion ?? {})
const estado = ref<string>(props.msg?.invitacion?.estado ?? 'PENDIENTE')
const procesando = ref(false)

// El invitador recibe por WebSocket la respuesta y actualiza la tarjeta sin
// recargar la conversacion.
watch(
  () => props.msg?.invitacion?.estado,
  (nuevo) => {
    if (nuevo) estado.value = nuevo
  }
)

const pendiente = computed(() => estado.value === 'PENDIENTE')
const puedeResponder = computed(() => pendiente.value && !props.msg?.esMio)
const etiquetaEstado = computed(() => {
  if (estado.value === 'ACEPTADA') return 'Aceptada'
  if (estado.value === 'RECHAZADA') return 'Rechazada'
  return 'Pendiente'
})

const notaEstado = computed(() => {
  if (estado.value === 'ACEPTADA') {
    return props.msg?.esMio ? 'Aceptó la invitación y ya es miembro.' : 'Ya formas parte de este canal.'
  }
  if (estado.value === 'RECHAZADA') {
    return props.msg?.esMio ? 'Rechazó la invitación.' : 'Has rechazado esta invitación.'
  }
  return props.msg?.esMio
    ? 'Esperando respuesta. La invitación llegó a su mensajería privada.'
    : 'Te ha invitado a un canal privado.'
})

async function responder(aceptar: boolean) {
  if (procesando.value || !pendiente.value) return
  procesando.value = true
  try {
    const { data } = aceptar
      ? await chatApi.aceptarInvitacion(invitacion.value.id)
      : await chatApi.rechazarInvitacion(invitacion.value.id)
    estado.value = data?.estado ?? (aceptar ? 'ACEPTADA' : 'RECHAZADA')
    emit('resuelta', estado.value)
    if (aceptar && data?.canalId != null) emit('unirse', data.canalId)
  } catch (e: any) {
    emit('error', e?.response?.data?.error || 'No se pudo responder a la invitación.')
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <article class="invitacion-fila" :class="{ 'invitacion-fila--mio': msg.esMio }">
    <div
      class="invitacion-card"
      :class="{ 'invitacion-card--mio': msg.esMio }"
      role="group"
      :aria-label="`Invitación al canal ${invitacion.canalNombre || ''}`"
    >
      <div class="invitacion-card__cabecera">
        <img
          :src="canalAvatar({ nombre: invitacion.canalNombre || 'Canal', imagenUrl: invitacion.canalImagenUrl })"
          class="invitacion-card__avatar"
          width="42"
          height="42"
          alt=""
        />
        <div class="min-w-0 flex-grow-1">
          <p class="invitacion-card__etiqueta mb-0">Invitación a un canal privado</p>
          <h3 class="invitacion-card__titulo text-truncate mb-0">{{ invitacion.canalNombre || 'Canal' }}</h3>
          <p class="invitacion-card__meta mb-0">
            <template v-if="msg.esMio">Invitación enviada</template>
            <template v-else>De {{ invitacion.invitadorNombre || 'un personaje' }}</template>
            · {{ formatFecha(msg.fechaEnvio) }}
          </p>
        </div>
        <span class="invitacion-card__estado" :class="`invitacion-card__estado--${estado.toLowerCase()}`">
          {{ etiquetaEstado }}
        </span>
      </div>

      <p v-if="invitacion.canalDescripcion" class="invitacion-card__descripcion mb-0">
        {{ invitacion.canalDescripcion }}
      </p>

      <p class="invitacion-card__nota mb-0" role="status">{{ notaEstado }}</p>

      <div v-if="puedeResponder" class="invitacion-card__acciones">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="procesando"
          @click="responder(true)"
        >
          <span v-if="procesando" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
          <i v-else class="bi bi-box-arrow-in-right me-1" aria-hidden="true"></i>
          Unirse al canal
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          :disabled="procesando"
          @click="responder(false)"
        >
          Rechazar
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.invitacion-fila {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0.85rem;
}

.invitacion-fila--mio {
  justify-content: flex-end;
}

.invitacion-card {
  width: min(100%, 380px);
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-lg);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-sm);
}

.invitacion-card--mio {
  border-color: rgba(var(--pl-primary-rgb), 0.35);
  background: rgba(var(--pl-primary-rgb), 0.05);
}

.invitacion-card__cabecera {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}

.invitacion-card__avatar {
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.invitacion-card__etiqueta {
  color: var(--pl-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.invitacion-card__titulo {
  color: var(--pl-ink);
  font-size: 1rem;
  font-weight: 800;
}

.invitacion-card__meta {
  color: var(--pl-muted);
  font-size: 0.78rem;
}

.invitacion-card__estado {
  flex-shrink: 0;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

.invitacion-card__estado--pendiente {
  color: var(--pl-warning-ink);
  background: rgba(var(--pl-warning-rgb), 0.16);
}

.invitacion-card__estado--aceptada {
  color: var(--pl-success-ink);
  background: rgba(var(--pl-success-rgb), 0.16);
}

.invitacion-card__estado--rechazada {
  color: var(--pl-danger-ink);
  background: rgba(var(--pl-danger-rgb), 0.14);
}

.invitacion-card__descripcion {
  margin-top: 0.55rem;
  color: var(--pl-ink);
  font-size: 0.86rem;
  overflow-wrap: anywhere;
}

.invitacion-card__nota {
  margin-top: 0.5rem;
  color: var(--pl-muted);
  font-size: 0.8rem;
}

.invitacion-card__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.65rem;
}

.invitacion-card :focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 2px;
}
</style>

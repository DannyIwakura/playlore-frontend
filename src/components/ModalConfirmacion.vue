<script setup lang="ts">
import { ref } from 'vue'
import { useModalFocus } from '../composables/useModalFocus'

withDefaults(
  defineProps<{
    mensaje: string
    titulo?: string
    botonConfirmar?: string
    botonCancelar?: string
    peligro?: boolean
  }>(),
  {
    titulo: 'Confirmar',
    botonConfirmar: 'Confirmar',
    botonCancelar: 'Cancelar',
    peligro: false,
  }
)

const emit = defineEmits<{
  (e: 'confirmar'): void
  (e: 'cancelar'): void
}>()

const containerRef = ref<HTMLElement | null>(null)

useModalFocus({
  containerRef,
  cerrar: () => emit('cancelar'),
})
</script>

<template>
  <div ref="containerRef" class="modal-backdrop-custom" @click.self="emit('cancelar')">
    <div class="modal-content-custom shadow rounded-3 p-4" role="dialog" aria-modal="true" :aria-label="titulo" tabindex="-1">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-exclamation-triangle me-2 text-warning"></i>{{ titulo }}</h5>
        <button type="button" class="btn-close" aria-label="Cerrar" @click="emit('cancelar')"></button>
      </div>
      <div class="mb-4 pl-pre-wrap">{{ mensaje }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="emit('cancelar')">{{ botonCancelar }}</button>
        <button type="button" class="btn" :class="peligro ? 'btn-danger' : 'btn-primary'" @click="emit('confirmar')">
          {{ botonConfirmar }}
        </button>
      </div>
    </div>
  </div>
</template>

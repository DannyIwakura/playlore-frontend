<script setup lang="ts">
import { ref } from 'vue'
import { useModalFocus } from '../composables/useModalFocus'

defineProps<{
  mensaje: string
  titulo?: string
}>()

const emit = defineEmits<{
  (e: 'cerrar'): void
}>()

const containerRef = ref<HTMLElement | null>(null)

useModalFocus({
  containerRef,
  cerrar: () => emit('cerrar'),
})
</script>

<template>
  <div ref="containerRef" class="modal-backdrop-custom" @click.self="emit('cerrar')">
    <div class="modal-content-custom shadow rounded-3 p-4" role="dialog" aria-modal="true" :aria-label="titulo ?? 'Aviso'" tabindex="-1">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-info-circle me-2 text-primary"></i>{{ titulo ?? 'Aviso' }}</h5>
        <button type="button" class="btn-close" aria-label="Cerrar" @click="emit('cerrar')"></button>
      </div>
      <div class="mb-4 pl-pre-wrap">{{ mensaje }}</div>
      <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-primary" @click="emit('cerrar')">Aceptar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  mensaje: string
  titulo?: string
}>()

const emit = defineEmits<{
  (e: 'cerrar'): void
}>()
</script>

<template>
  <div class="modal-backdrop-custom" @click.self="emit('cerrar')">
    <div class="modal-content-custom shadow rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-info-circle me-2 text-primary"></i>{{ titulo ?? 'Aviso' }}</h5>
        <button type="button" class="btn-close" @click="emit('cerrar')"></button>
      </div>
      <div class="mb-4" style="white-space: pre-wrap">{{ mensaje }}</div>
      <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-primary" @click="emit('cerrar')">Aceptar</button>
      </div>
    </div>
  </div>
</template>

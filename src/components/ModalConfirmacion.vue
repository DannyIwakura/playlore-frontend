<script setup lang="ts">
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
</script>

<template>
  <div class="modal-backdrop-custom" @click.self="emit('cancelar')">
    <div class="modal-content-custom shadow rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-exclamation-triangle me-2 text-warning"></i>{{ titulo }}</h5>
        <button type="button" class="btn-close" @click="emit('cancelar')"></button>
      </div>
      <div class="mb-4" style="white-space: pre-wrap">{{ mensaje }}</div>
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="emit('cancelar')">{{ botonCancelar }}</button>
        <button type="button" class="btn" :class="peligro ? 'btn-danger' : 'btn-primary'" @click="emit('confirmar')">
          {{ botonConfirmar }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1060;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content-custom {
  background: #fff;
  width: 100%;
  max-width: 440px;
  margin: 1rem;
  max-height: 90vh;
  overflow-y: auto;
}
</style>

<script setup lang="ts">
import { ref, useId } from 'vue'
import { useModalFocus } from '../composables/useModalFocus'

withDefaults(
  defineProps<{
    titulo: string
    ancho?: 'sm' | 'md'
  }>(),
  {
    ancho: 'sm',
  }
)

const emit = defineEmits<{
  (e: 'cerrar'): void
}>()

const tituloId = `modal-formulario-${useId()}`
const containerRef = ref<HTMLElement | null>(null)

useModalFocus({
  containerRef,
  cerrar: () => emit('cerrar'),
})
</script>

<template>
  <div ref="containerRef" class="modal-backdrop-custom" @click.self="emit('cerrar')">
    <div
      class="modal-content-custom modal-formulario"
      :class="`modal-formulario--${ancho}`"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="tituloId"
      tabindex="-1"
    >
      <div class="modal-formulario__cabecera">
        <h2 :id="tituloId" class="pl-modal-title mb-0">{{ titulo }}</h2>
        <button type="button" class="btn-close" aria-label="Cerrar" @click="emit('cerrar')"></button>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.modal-formulario {
  padding: 1.35rem;
}

.modal-formulario--md {
  max-width: 560px;
}

.modal-formulario__cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
</style>

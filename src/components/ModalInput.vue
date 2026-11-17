<script setup lang="ts">
import { ref, watch, nextTick, useId } from 'vue'
import { useModalFocus } from '../composables/useModalFocus'

const props = withDefaults(
  defineProps<{
    titulo: string
    mensaje?: string
    etiqueta: string
    valorInicial?: string
    placeholder?: string
    botonConfirmar?: string
    botonCancelar?: string
    type?: string
  }>(),
  {
    mensaje: '',
    valorInicial: '',
    placeholder: '',
    botonConfirmar: 'Aceptar',
    botonCancelar: 'Cancelar',
    type: 'text',
  }
)

const emit = defineEmits<{
  (e: 'confirmar', valor: string): void
  (e: 'cancelar'): void
}>()

const containerRef = ref<HTMLElement | null>(null)

useModalFocus({
  containerRef,
  cerrar: cancelar,
})

const valor = ref(props.valorInicial)
const inputRef = ref<HTMLInputElement | null>(null)
const inputId = useId()
const mensajeId = `${inputId}-mensaje`

watch(() => props.valorInicial, (v) => {
  valor.value = v
})

watch(() => props.titulo, async () => {
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
})

function confirmar() {
  emit('confirmar', valor.value.trim())
}

function cancelar() {
  emit('cancelar')
}
</script>

<template>
  <div ref="containerRef" class="modal-backdrop-custom" @click.self="cancelar">
    <div class="modal-content-custom shadow rounded-3 p-4" role="dialog" aria-modal="true" :aria-label="titulo" tabindex="-1">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-pencil-square me-2 text-primary"></i>{{ titulo }}</h5>
        <button class="btn-close" type="button" aria-label="Cerrar" @click="cancelar"></button>
      </div>
      <p v-if="mensaje" :id="mensajeId" class="mb-3 pl-pre-wrap">{{ mensaje }}</p>
      <form @submit.prevent="confirmar">
        <label class="form-label" :for="inputId">
          <span class="small text-muted">{{ etiqueta }}</span>
        </label>
        <input
          :id="inputId"
          ref="inputRef"
          v-model="valor"
          class="form-control mb-3"
          :type="type"
          :placeholder="placeholder"
          :aria-describedby="mensaje ? mensajeId : undefined"
          autofocus
        />
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary" @click="cancelar">{{ botonCancelar }}</button>
          <button type="submit" class="btn btn-primary" :disabled="!valor">{{ botonConfirmar }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

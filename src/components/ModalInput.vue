<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

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

const valor = ref(props.valorInicial)
const inputRef = ref<HTMLInputElement | null>(null)

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
  <div class="modal-backdrop-custom" @click.self="cancelar">
    <div class="modal-content-custom shadow rounded-3 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0"><i class="bi bi-pencil-square me-2 text-primary"></i>{{ titulo }}</h5>
        <button class="btn-close" type="button" @click="cancelar"></button>
      </div>
      <p v-if="mensaje" class="mb-3" style="white-space: pre-wrap">{{ mensaje }}</p>
      <form @submit.prevent="confirmar">
        <label class="form-label d-block">
          <span class="small text-muted">{{ etiqueta }}</span>
          <input
            ref="inputRef"
            v-model="valor"
            class="form-control"
            :type="type"
            :placeholder="placeholder"
            autofocus
          />
        </label>
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary" @click="cancelar">{{ botonCancelar }}</button>
          <button type="submit" class="btn btn-primary" :disabled="!valor">{{ botonConfirmar }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

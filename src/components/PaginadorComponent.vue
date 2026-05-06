<script setup lang="ts">
defineProps<{
  paginaActual: number
  totalPaginas: number
}>()

const emit = defineEmits<{
  (e: 'cambiar', pagina: number): void
}>()
</script>

<template>
  <nav v-if="totalPaginas > 1" class="d-flex justify-content-center mt-4">
    <ul class="pagination">
      <li class="page-item" :class="{ disabled: paginaActual === 0 }">
        <button class="page-link" @click="emit('cambiar', paginaActual - 1)">
          &laquo;
        </button>
      </li>
      <li
        v-for="p in totalPaginas"
        :key="p"
        class="page-item"
        :class="{ active: paginaActual === p - 1 }"
      >
        <button class="page-link" @click="emit('cambiar', p - 1)">
          {{ p }}
        </button>
      </li>
      <li class="page-item" :class="{ disabled: paginaActual === totalPaginas - 1 }">
        <button class="page-link" @click="emit('cambiar', paginaActual + 1)">
          &raquo;
        </button>
      </li>
    </ul>
  </nav>
</template>
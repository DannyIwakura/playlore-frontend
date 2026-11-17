<script setup lang="ts">
defineProps<{
  paginaActual: number
  totalPaginas: number
}>()

const emit = defineEmits<{
  (e: 'cambiar', pagina: number): void
}>()

function irA(pagina: number, totalPaginas: number) {
  if (pagina < 0 || pagina >= totalPaginas) return
  emit('cambiar', pagina)
}
</script>

<template>
  <nav v-if="totalPaginas > 1" class="pl-paginador-nav" aria-label="Paginación">
    <ul class="pl-paginador">
      <li>
        <button
          type="button"
          class="pl-paginador__btn"
          :aria-disabled="paginaActual === 0"
          aria-label="Página anterior"
          title="Página anterior"
          @click="irA(paginaActual - 1, totalPaginas)"
        >
          <span aria-hidden="true">&laquo;</span>
        </button>
      </li>

      <li v-for="p in totalPaginas" :key="p">
        <button
          type="button"
          class="pl-paginador__btn"
          :aria-current="paginaActual === p - 1 ? 'page' : undefined"
          :aria-label="`Página ${p}`"
          @click="irA(p - 1, totalPaginas)"
        >
          {{ p }}
        </button>
      </li>

      <li>
        <button
          type="button"
          class="pl-paginador__btn"
          :aria-disabled="paginaActual === totalPaginas - 1"
          aria-label="Página siguiente"
          title="Página siguiente"
          @click="irA(paginaActual + 1, totalPaginas)"
        >
          <span aria-hidden="true">&raquo;</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.pl-paginador-nav {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.pl-paginador {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pl-paginador__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 2.5rem;
  min-block-size: 2.5rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-sm);
  background: var(--pl-surface);
  color: var(--pl-ink);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

@media (hover: hover) {
  .pl-paginador__btn:hover {
    border-color: rgba(var(--pl-primary-rgb), 0.34);
    background: var(--pl-surface-soft);
  }
}

.pl-paginador__btn:focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 2px;
}

.pl-paginador__btn[aria-current='page'] {
  border-color: var(--pl-primary-strong);
  background: var(--pl-primary-strong);
  color: #fff;
}

.pl-paginador__btn[aria-disabled='true'] {
  color: var(--pl-muted);
  cursor: default;
  opacity: 0.55;
}

@media (hover: hover) {
  .pl-paginador__btn[aria-disabled='true']:hover {
    border-color: var(--pl-border);
    background: var(--pl-surface);
  }
}

@media (pointer: coarse) {
  .pl-paginador__btn {
    min-inline-size: 2.75rem;
    min-block-size: 2.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pl-paginador__btn {
    transition: none;
  }
}
</style>

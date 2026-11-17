<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    titulo: string
    columnas: Array<{ etiqueta: string; clase?: string }>
    total?: number
    cargando?: boolean
    error?: string
    vacio?: string
    resumen?: string
  }>(),
  {
    total: 0,
    cargando: false,
    error: '',
    vacio: 'No hay resultados.',
    resumen: '',
  }
)

const captionId = `tabla-admin-${useId()}`
</script>

<template>
  <section class="pl-tabla-admin">
    <div v-if="$slots.barra || resumen" class="pl-tabla-admin__barra">
      <slot name="barra" />
      <p v-if="resumen" class="pl-tabla-admin__resumen" role="status">{{ resumen }}</p>
    </div>

    <div v-if="error" class="pl-alert pl-alert--danger" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="cargando" class="pl-empty-state pl-empty-state--compact" role="status">
      <span class="spinner-border text-primary" aria-hidden="true"></span>
      <p class="mb-0">Cargando…</p>
    </div>

    <div v-else-if="total === 0" class="pl-empty-state pl-empty-state--compact" role="status">
      <span class="pl-empty-state__icon">
        <i class="bi bi-inbox" aria-hidden="true"></i>
      </span>
      <p class="mb-0">{{ vacio }}</p>
    </div>

    <div v-else class="pl-tabla-envoltura" role="region" :aria-labelledby="captionId" tabindex="0">
      <table class="pl-tabla-admin">
        <caption :id="captionId" class="visually-hidden">{{ titulo }}</caption>
        <thead>
          <tr>
            <th v-for="columna in columnas" :key="columna.etiqueta" scope="col" :class="columna.clase">
              {{ columna.etiqueta }}
            </th>
          </tr>
        </thead>
        <tbody>
          <slot />
        </tbody>
      </table>
    </div>

    <div v-if="$slots.pie" class="pl-tabla-admin__pie">
      <slot name="pie" />
    </div>
  </section>
</template>

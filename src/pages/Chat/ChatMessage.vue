<script setup lang="ts">
import { avatarUrl, formatFecha } from './chatUtils'

const props = defineProps<{
  msg: any
  esMio: boolean
  avatarSrc?: string
  showHeader?: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  delete: [msgId: number]
  verPerfil: [personajeId: number]
}>()
</script>

<template>
  <div class="d-flex gap-2 mb-3"
       :class="{ 'flex-row-reverse': esMio }"
       :style="esMio ? 'margin-left:auto;max-width:85%;' : 'max-width:85%;'">
    <img :src="avatarSrc ?? avatarUrl(msg.personajeAvatar)"
         class="rounded-circle flex-shrink-0"
         width="32" height="32" style="object-fit: cover; cursor:pointer;"
         @click="emit('verPerfil', msg.emisorId ?? msg.personajeId)" />
    <div class="mensaje-burbuja px-3 py-2"
         :class="esMio ? 'bg-primary text-white' : 'bg-light'"
         :style="esMio ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'">
      <div v-if="showHeader" class="d-flex justify-content-between align-items-baseline gap-2">
        <small class="fw-bold" style="cursor:pointer;"
               :class="esMio ? 'text-white' : ''"
               @click="emit('verPerfil', msg.personajeId)">
          {{ msg.personajeNombre }}
        </small>
        <small class="opacity-50" style="font-size:0.65rem;">
          {{ formatFecha(msg.fechaEnvio) }}
          <span v-if="msg.editado" class="ms-1">(edit)</span>
        </small>
      </div>
      <p v-if="msg.eliminado" class="mb-0 mt-1 fst-italic text-muted" style="font-size:0.85rem;">
        {{ msg.eliminadoPorModerador ? 'El mensaje fue eliminado por moderación' : (esMio ? 'Eliminaste este mensaje' : 'El mensaje fue eliminado por el usuario') }}
      </p>
      <p v-else class="mb-0" :class="showHeader ? 'mt-1' : ''"
         style="white-space:pre-wrap;word-break:break-word;" v-html="msg.contenido"></p>
      <div v-if="!msg.eliminado && canDelete" class="mt-1">
        <button class="btn btn-sm text-danger p-0" style="font-size:0.65rem;"
                @click="emit('delete', msg.id)">
          <i class="bi bi-trash"></i>
        </button>
      </div>
      <small v-if="!showHeader && !msg.eliminado"
             class="opacity-50 d-block text-end mt-1" style="font-size:0.65rem;">
        {{ formatFecha(msg.fechaEnvio) }}
      </small>
    </div>
  </div>
</template>

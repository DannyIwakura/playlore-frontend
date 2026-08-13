<script setup lang="ts">
import { avatarUrl, formatFecha, truncarTexto } from './chatUtils'

const props = defineProps<{
  msg: any
  esMio: boolean
  avatarSrc?: string
  showHeader?: boolean
  canDelete?: boolean
  canEditar?: boolean
  canDenunciar?: boolean
  mostrarAcciones?: boolean
  destacar?: boolean
}>()

const emit = defineEmits<{
  delete: [msgId: number]
  verPerfil: [personajeId: number]
  responder: [msg: any]
  copiar: [msg: any]
  editar: [msg: any]
  denunciar: [msg: any]
  'scroll-a-mensaje': [mensajeId: number]
}>()
</script>

<template>
  <div class="d-flex gap-2 mb-3 msg-row"
       :class="[{ 'msg-row-flash': destacar }, { 'flex-row-reverse': esMio }]"
       :data-msg-id="msg.id"
       :style="esMio ? 'margin-left:auto;max-width:85%;' : 'max-width:85%;'">
    <img :src="avatarSrc ?? avatarUrl(msg.personajeAvatar)"
         class="rounded-circle flex-shrink-0"
         width="32" height="32" style="object-fit: cover; cursor:pointer;"
         @click="emit('verPerfil', msg.emisorId ?? msg.personajeId)" />
    <div class="mensaje-burbuja px-3 py-2 position-relative"
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
      <div v-if="mostrarAcciones && !msg.eliminado && msg.mensajePadreId"
           class="msg-reply-preview"
           :title="'Respondiendo a @' + msg.mensajePadreAutor"
           @click="emit('scroll-a-mensaje', msg.mensajePadreId)">
        <span class="msg-reply-autor">Respondiendo a @{{ msg.mensajePadreAutor }}</span>
        <span class="msg-reply-texto">{{ truncarTexto(msg.mensajePadreContenido, 120) }}</span>
      </div>
      <p v-if="msg.eliminado" class="mb-0 mt-1 fst-italic text-muted" style="font-size:0.85rem;">
        {{ msg.eliminadoPorModerador ? 'El mensaje fue eliminado por moderación' : 'El mensaje fue eliminado por el usuario' }}
      </p>
      <p v-else class="mb-0" :class="showHeader ? 'mt-1' : ''"
         style="white-space:pre-wrap;word-break:break-word;" v-sanitize="msg.contenido"></p>
      <small v-if="!showHeader && !msg.eliminado"
             class="opacity-50 d-block text-end mt-1" style="font-size:0.65rem;">
        {{ formatFecha(msg.fechaEnvio) }}
      </small>
      <div v-if="mostrarAcciones && !msg.eliminado" class="msg-actions" @click.stop>
        <button type="button" title="Responder" @click="emit('responder', msg)">
          <i class="bi bi-reply"></i>
        </button>
        <button type="button" title="Copiar" @click="emit('copiar', msg)">
          <i class="bi bi-clipboard"></i>
        </button>
        <button v-if="canEditar" type="button" title="Editar" @click="emit('editar', msg)">
          <i class="bi bi-pencil"></i>
        </button>
        <button v-if="canDelete" type="button" title="Eliminar" class="text-danger" @click="emit('delete', msg.id)">
          <i class="bi bi-trash"></i>
        </button>
        <button v-if="canDenunciar" type="button" title="Denunciar" @click="emit('denunciar', msg)">
          <i class="bi bi-flag"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg-row { position: relative; }

.msg-row-flash::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: #d8e7ff;
  z-index: 1;
  pointer-events: none;
  animation: msg-flash 2s ease;
}
@keyframes msg-flash {
  0% {
    opacity: 0;
  }
  15% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
  }
}

.msg-actions {
  position: absolute;
  top: -10px;
  right: 6px;
  display: flex;
  gap: 2px;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 3px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  opacity: 0;
  transition: opacity 0.12s;
  z-index: 5;
}
.msg-row:hover .msg-actions,
.msg-actions:focus-within {
  opacity: 1;
}
.msg-actions button {
  border: none;
  background: transparent;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  font-size: 0.85rem;
  cursor: pointer;
}
.msg-actions button:hover {
  background: #e9ecef;
}
.msg-actions button.text-danger:hover {
  color: #dc3545;
}

.msg-reply-preview {
  display: flex;
  flex-direction: column;
  border-left: 3px solid currentColor;
  background: rgba(127, 127, 127, 0.16);
  border-radius: 4px;
  padding: 3px 8px;
  margin-bottom: 5px;
  cursor: pointer;
  min-width: 0;
}
.msg-reply-preview:hover {
  background: rgba(13, 110, 253, 0.16);
}
.msg-reply-autor {
  font-size: 0.7rem;
  font-weight: 600;
  color: inherit;
  opacity: 0.9;
}
.msg-reply-texto {
  font-size: 0.78rem;
  opacity: 0.72;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

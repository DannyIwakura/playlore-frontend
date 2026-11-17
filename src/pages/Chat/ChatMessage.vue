<script setup lang="ts">
import { computed } from 'vue'
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

const nombreAutor = computed(() => props.msg.personajeNombre || 'este personaje')

// Los botones de accion se repiten en cada mensaje, asi que su nombre
// accesible incluye autor y un resumen para distinguirlos entre si.
const resumen = computed(() =>
  String(props.msg.contenido ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)

function etiqueta(accion: string): string {
  const texto = truncarTexto(resumen.value, 40)
  const base =
    accion === 'Responder'
      ? `Responder a ${nombreAutor.value}`
      : `${accion} el mensaje de ${nombreAutor.value}`
  return texto ? `${base}: ${texto}` : base
}

const personajeId = computed(() => props.msg.emisorId ?? props.msg.personajeId)
const avatar = computed(() => props.avatarSrc ?? avatarUrl(props.msg.personajeAvatar))
</script>

<template>
  <article
    class="msg-row"
    :class="{ 'msg-row--mio': esMio, 'msg-row--destacado': destacar }"
    :data-msg-id="msg.id"
  >
    <button
      type="button"
      class="msg-avatar"
      :aria-label="`Ver perfil de ${nombreAutor}`"
      @click="emit('verPerfil', personajeId)"
    >
      <img :src="avatar" alt="" width="34" height="34" />
    </button>

    <div class="msg-burbuja" :class="esMio ? 'msg-burbuja--mio' : 'msg-burbuja--otro'">
      <div v-if="showHeader" class="msg-cabecera">
        <button type="button" class="msg-autor" @click="emit('verPerfil', msg.personajeId)">
          {{ msg.personajeNombre }}
        </button>
        <span class="msg-hora">
          {{ formatFecha(msg.fechaEnvio) }}
          <span v-if="msg.editado" class="msg-editado">(editado)</span>
        </span>
      </div>

      <button
        v-if="mostrarAcciones && !msg.eliminado && msg.mensajePadreId"
        type="button"
        class="msg-reply-preview"
        :aria-label="`Ir al mensaje de ${msg.mensajePadreAutor}`"
        @click="emit('scroll-a-mensaje', msg.mensajePadreId)"
      >
        <span class="msg-reply-autor">Respondiendo a @{{ msg.mensajePadreAutor }}</span>
        <span class="msg-reply-texto">{{ truncarTexto(msg.mensajePadreContenido, 120) }}</span>
      </button>

      <p v-if="msg.eliminado" class="msg-eliminado">
        {{
          msg.eliminadoPorModerador
            ? 'El mensaje fue eliminado por moderación'
            : 'El mensaje fue eliminado por el usuario'
        }}
      </p>
      <div v-else class="msg-contenido" :class="{ 'msg-contenido--con-cabecera': showHeader }" v-sanitize="msg.contenido"></div>

      <span v-if="!showHeader && !msg.eliminado" class="msg-hora msg-hora--suelta">
        {{ formatFecha(msg.fechaEnvio) }}
        <span v-if="msg.editado" class="msg-editado">(editado)</span>
      </span>

      <div v-if="mostrarAcciones && !msg.eliminado" class="msg-acciones">
        <button type="button" title="Responder" :aria-label="etiqueta('Responder')" @click="emit('responder', msg)">
          <i class="bi bi-reply" aria-hidden="true"></i>
        </button>
        <button type="button" title="Copiar" :aria-label="etiqueta('Copiar')" @click="emit('copiar', msg)">
          <i class="bi bi-clipboard" aria-hidden="true"></i>
        </button>
        <button v-if="canEditar" type="button" title="Editar" :aria-label="etiqueta('Editar')" @click="emit('editar', msg)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
        <button
          v-if="canDelete"
          type="button"
          class="msg-accion--peligro"
          title="Eliminar"
          :aria-label="etiqueta('Eliminar')"
          @click="emit('delete', msg.id)"
        >
          <i class="bi bi-trash" aria-hidden="true"></i>
        </button>
        <button
          v-if="canDenunciar"
          type="button"
          class="msg-accion--peligro"
          title="Denunciar"
          :aria-label="etiqueta('Denunciar')"
          @click="emit('denunciar', msg)"
        >
          <i class="bi bi-flag" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.msg-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: min(85%, 720px);
  margin-bottom: 0.85rem;
}

.msg-row--mio {
  flex-direction: row-reverse;
  margin-left: auto;
}

/* ---- Avatar ---- */

.msg-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  transition: box-shadow var(--pl-duration-fast) var(--pl-ease-standard);
}

.msg-avatar img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--pl-surface-soft);
  box-shadow: inset 0 0 0 1px var(--pl-border);
}

.msg-avatar:hover {
  box-shadow: 0 0 0 3px rgba(var(--pl-primary-rgb), 0.18);
}

/* En tactil el area del avatar llega a 44 px sin agrandar la imagen. */
@media (pointer: coarse) {
  .msg-avatar {
    position: relative;
  }

  .msg-avatar::after {
    content: '';
    position: absolute;
    inset: -4px;
  }
}

/* ---- Burbuja ---- */

.msg-burbuja {
  position: relative;
  min-width: 0;
  max-width: 100%;
  padding: 0.5rem 0.8rem 0.45rem;
  border-radius: var(--pl-radius-lg);
  font-size: 0.94rem;
  line-height: 1.5;
  box-shadow: var(--pl-shadow-sm);
}

.msg-burbuja--otro {
  border: 1px solid var(--pl-border);
  border-bottom-left-radius: 0.35rem;
  background: var(--pl-surface);
  color: var(--pl-ink);
}

.msg-burbuja--mio {
  border-bottom-right-radius: 0.35rem;
  background: var(--pl-primary-strong);
  color: #fff;
}

.msg-cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.15rem;
}

.msg-autor {
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  text-align: left;
  overflow-wrap: anywhere;
}

.msg-autor:hover {
  text-decoration: underline;
}

.msg-hora {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--pl-muted);
  white-space: nowrap;
}

.msg-burbuja--mio .msg-hora {
  color: rgba(255, 255, 255, 0.88);
}

.msg-hora--suelta {
  display: block;
  margin-top: 0.2rem;
  text-align: right;
}

.msg-editado {
  margin-left: 0.2rem;
  font-style: italic;
}

.msg-contenido {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.msg-contenido--con-cabecera {
  margin-top: 0.1rem;
}

.msg-contenido :deep(p) {
  margin: 0;
}

.msg-contenido :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.msg-eliminado {
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
  font-style: italic;
  opacity: 0.85;
}

/* ---- Respuesta citada ---- */

.msg-reply-preview {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0 0 0.35rem;
  padding: 0.2rem 0.55rem;
  border: 0;
  border-left: 3px solid var(--pl-primary-light);
  border-radius: var(--pl-radius-sm);
  background: rgba(var(--pl-primary-rgb), 0.06);
  color: var(--pl-primary-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard);
}

.msg-reply-preview:hover {
  background: rgba(var(--pl-primary-rgb), 0.12);
}

.msg-burbuja--mio .msg-reply-preview {
  border-left-color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.msg-burbuja--mio .msg-reply-preview:hover {
  background: rgba(255, 255, 255, 0.22);
}

.msg-reply-autor {
  font-size: 0.75rem;
  font-weight: 750;
  opacity: 0.92;
}

.msg-reply-texto {
  width: 100%;
  overflow: hidden;
  font-size: 0.8rem;
  opacity: 0.78;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Acciones ---- */

.msg-acciones {
  position: absolute;
  top: -14px;
  right: 6px;
  z-index: 5;
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-md);
  opacity: 0;
  transition: opacity var(--pl-duration-fast) var(--pl-ease-standard);
}

.msg-row:hover .msg-acciones,
.msg-acciones:focus-within {
  opacity: 1;
}

/* Sin hover (tactil) las acciones no pueden depender del puntero: se muestran
   siempre, dentro de la burbuja y con area tactil suficiente. */
@media (hover: none) {
  .msg-acciones {
    position: static;
    justify-content: flex-end;
    margin-top: 0.35rem;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    opacity: 1;
  }
}

.msg-acciones button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: var(--pl-radius-sm);
  background: transparent;
  color: var(--pl-muted);
  font-size: 0.85rem;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard), color var(--pl-duration-fast) var(--pl-ease-standard);
}

.msg-acciones button:hover {
  background: var(--pl-surface-soft);
  color: var(--pl-ink);
}

.msg-acciones .msg-accion--peligro:hover {
  background: rgba(var(--pl-danger-rgb), 0.1);
  color: var(--pl-danger-ink);
}

@media (pointer: coarse) {
  .msg-acciones button {
    width: 44px;
    height: 44px;
    font-size: 1rem;
  }
}

/* ---- Foco y resaltado ---- */

.msg-row :focus-visible {
  outline: 2px solid var(--pl-primary);
  outline-offset: 2px;
}

.msg-burbuja--mio :focus-visible {
  outline-color: #fff;
}

.msg-row--destacado::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: var(--pl-radius-md);
  background: rgba(var(--pl-primary-rgb), 0.16);
  pointer-events: none;
  animation: msg-flash 2s ease;
}

@keyframes msg-flash {
  0% {
    opacity: 0;
  }

  15% {
    opacity: 0.9;
  }

  100% {
    opacity: 0;
  }
}

/* Sin animacion, el resaltado se queda como contorno mientras siga activo. */
@media (prefers-reduced-motion: reduce) {
  .msg-row--destacado::after {
    display: none;
  }

  .msg-row--destacado {
    outline: 2px solid var(--pl-primary);
    outline-offset: 2px;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import OnlineStatusBadge from './OnlineStatusBadge.vue'
import { userStore } from '../store/userStore'
import type { AnuncioDTO } from '../pages/Anuncios/anuncios'

const props = withDefaults(
  defineProps<{
    anuncio: AnuncioDTO
    /** Se desactiva dentro del perfil del personaje, donde ya estás en él. */
    accionesPublicas?: boolean
  }>(),
  { accionesPublicas: true },
)

const emit = defineEmits<{
  'ver-perfil': [personajeId: number]
  'enviar-mp': [personajeId: number]
  editar: [anuncio: AnuncioDTO]
  'cambiar-activo': [anuncio: AnuncioDTO, activo: boolean]
  eliminar: [anuncio: AnuncioDTO]
}>()

const BASE_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${BASE_URL}/images/AVATAR.png`

const esPropio = computed(() => props.anuncio.usuarioId === userStore.usuario.value?.id)

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return BASE_URL + avatar
}

function usarAvatarDefecto(event: Event) {
  const img = event.target as HTMLImageElement
  if (img.dataset.fallback === '1') return
  img.dataset.fallback = '1'
  img.src = AVATAR_DEFECTO
}
</script>

<template>
  <article class="pl-card anuncio-card">
    <header class="anuncio-card__cabecera">
      <img
        class="pl-avatar anuncio-card__avatar"
        :src="avatarUrl(anuncio.avatarPersonaje)"
        :alt="`Avatar de ${anuncio.nombrePersonaje}`"
        width="48"
        height="48"
        loading="lazy"
        decoding="async"
        @error="usarAvatarDefecto"
      />

      <div class="anuncio-card__identidad">
        <h2 class="anuncio-card__nombre">{{ anuncio.nombrePersonaje }}</h2>
        <p class="anuncio-card__presencia">
          <OnlineStatusBadge :online="anuncio.online" size="sm" />
          <span>{{ anuncio.online ? 'En línea' : 'Desconectado' }}</span>
        </p>
      </div>

      <span
        v-if="esPropio"
        class="pl-status-pill"
        :class="anuncio.activo ? 'pl-status-pill--success' : 'pl-status-pill--neutral'"
      >
        {{ anuncio.activo ? 'Activo' : 'Inactivo' }}
      </span>
    </header>

    <ul
      v-if="anuncio.categorias.length > 0"
      class="anuncio-card__categorias"
      aria-label="Categorías del anuncio"
    >
      <li v-for="categoria in anuncio.categorias" :key="categoria.idCategoria">
        {{ categoria.nombre }}
      </li>
    </ul>

    <div class="anuncio-card__contenido" v-sanitize="anuncio.contenido"></div>

    <footer class="anuncio-card__acciones">
      <template v-if="accionesPublicas">
        <button
          type="button"
          class="pl-btn pl-btn--secondary pl-btn--sm"
          :aria-label="`Ver el perfil de ${anuncio.nombrePersonaje}`"
          @click="emit('ver-perfil', anuncio.personajeId)"
        >
          <i class="bi bi-person" aria-hidden="true"></i>
          Ver Perfil
        </button>
        <button
          type="button"
          class="pl-btn pl-btn--primary pl-btn--sm"
          :aria-label="`Enviar un mensaje privado a ${anuncio.nombrePersonaje}`"
          @click="emit('enviar-mp', anuncio.personajeId)"
        >
          <i class="bi bi-envelope" aria-hidden="true"></i>
          Enviar MP
        </button>
      </template>

      <template v-if="esPropio">
        <button
          type="button"
          class="pl-btn pl-btn--sm"
          :class="anuncio.activo ? 'pl-btn--ghost' : 'pl-btn--success'"
          :aria-label="anuncio.activo ? 'Desactivar anuncio' : 'Activar anuncio'"
          @click="emit('cambiar-activo', anuncio, !anuncio.activo)"
        >
          <i :class="anuncio.activo ? 'bi bi-pause-circle' : 'bi bi-check-circle'" aria-hidden="true"></i>
          {{ anuncio.activo ? 'Desactivar' : 'Activar' }}
        </button>
        <button
          type="button"
          class="pl-btn pl-btn--ghost pl-btn--sm"
          :aria-label="`Editar el anuncio de ${anuncio.nombrePersonaje}`"
          @click="emit('editar', anuncio)"
        >
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Editar
        </button>
        <button
          type="button"
          class="pl-btn pl-btn--danger-ghost pl-btn--sm"
          :aria-label="`Eliminar el anuncio de ${anuncio.nombrePersonaje}`"
          @click="emit('eliminar', anuncio)"
        >
          <i class="bi bi-trash" aria-hidden="true"></i>
          Eliminar
        </button>
      </template>
    </footer>
  </article>
</template>

<style scoped>
.anuncio-card {
  display: flex;
  flex-direction: column;
  padding: 1.1rem;
}

.anuncio-card__cabecera {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.anuncio-card__avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.anuncio-card__identidad {
  min-width: 0;
  flex: 1 1 auto;
}

.anuncio-card__nombre {
  margin: 0;
  color: var(--pl-ink);
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.anuncio-card__presencia {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.2rem 0 0;
  color: var(--pl-muted);
  font-size: 0.78rem;
}

.anuncio-card__categorias {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.9rem 0 0;
  padding: 0;
  list-style: none;
}

.anuncio-card__categorias li {
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  color: var(--pl-primary-ink);
  background: rgba(var(--pl-primary-rgb), 0.1);
  font-size: 0.76rem;
  font-weight: 700;
}

.anuncio-card__contenido {
  flex: 1 1 auto;
  margin-top: 0.9rem;
  color: var(--pl-muted);
  font-size: 0.92rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.anuncio-card__contenido :deep(p),
.anuncio-card__contenido :deep(ul),
.anuncio-card__contenido :deep(ol) {
  margin: 0 0 0.6rem;
}

.anuncio-card__contenido :deep(p:last-child) {
  margin-bottom: 0;
}

.anuncio-card__contenido :deep(a) {
  color: var(--pl-primary-ink);
}

.anuncio-card__contenido :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--pl-radius-md);
}

.anuncio-card__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--pl-border);
}
</style>

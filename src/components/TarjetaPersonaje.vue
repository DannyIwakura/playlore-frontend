<script setup lang="ts">
const BASE_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${BASE_URL}/images/AVATAR.png`

defineProps<{
  personaje: {
    idPersonaje: number
    nombre: string
    genero: string | null
    raza: string | null
    clase: string | null
    edadPersonaje: number | null
    avatar: string | null
    trasfondo: string | null
  }
}>()

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) {
    return avatar
  }

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
  <article class="pl-card personaje-card">
    <img
      class="personaje-card__media"
      :src="avatarUrl(personaje.avatar)"
      alt=""
      width="640"
      height="400"
      loading="lazy"
      decoding="async"
      @error="usarAvatarDefecto"
    />

    <h2 class="personaje-card__title">
      <router-link
        :to="`/personaje/${personaje.idPersonaje}`"
        class="personaje-card__link"
      >
        {{ personaje.nombre }}
        <i class="bi bi-arrow-right" aria-hidden="true"></i>
      </router-link>
    </h2>

    <ul class="personaje-card__meta">
      <li v-if="personaje.genero">
        <i class="bi bi-gender-ambiguous" aria-hidden="true"></i>
        {{ personaje.genero }}
      </li>
      <li v-if="personaje.raza">
        <i class="bi bi-stars" aria-hidden="true"></i>
        {{ personaje.raza }}
      </li>
      <li v-if="personaje.clase">
        <i class="bi bi-shield" aria-hidden="true"></i>
        {{ personaje.clase }}
      </li>
      <li v-if="personaje.edadPersonaje !== null">
        <i class="bi bi-hourglass-split" aria-hidden="true"></i>
        {{ personaje.edadPersonaje }} años
      </li>
    </ul>

    <div class="personaje-card__content">
      <div
        v-if="personaje.trasfondo"
        class="personaje-card__trasfondo"
        v-sanitize="personaje.trasfondo"
      ></div>
      <p v-else class="personaje-card__sin-trasfondo">Sin trasfondo todavía.</p>
    </div>

    <footer v-if="$slots.acciones" class="personaje-card__actions">
      <slot name="acciones" />
    </footer>
  </article>
</template>

<style scoped>
.personaje-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.personaje-card__media {
  display: block;
  width: 100%;
  /* Sin esto el atributo height del <img> gana al aspect-ratio y descuadra la tarjeta. */
  height: auto;
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, rgba(var(--pl-primary-rgb), 0.16), rgba(var(--pl-cyan-rgb), 0.2));
  object-fit: cover;
  object-position: center 30%;
}

.personaje-card__title {
  margin: 0;
  padding: 1rem 1.1rem 0;
  font-size: 1.22rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: var(--pl-ink);
}

.personaje-card__link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  color: inherit;
  text-decoration: none;
}

.personaje-card__link i {
  color: var(--pl-primary);
  font-size: 0.9em;
}

.personaje-card__link:focus-visible {
  outline: none;
}

/* El enlace cubre toda la tarjeta: el anillo se dibuja en la tarjeta para que
   el foco de teclado siga siendo visible. */
.personaje-card:has(.personaje-card__link:focus-visible) {
  outline: 3px solid rgba(var(--pl-primary-rgb), 0.55);
  outline-offset: 2px;
}

/* Enlace estirado: toda la tarjeta navega al perfil, sin anidar controles. */
.personaje-card__link::after {
  content: "";
  position: absolute;
  inset: 0;
}

:slotted(a),
:slotted(button) {
  position: relative;
  z-index: 1;
}

.personaje-card:has(.personaje-card__link:hover) {
  border-color: rgba(var(--pl-primary-rgb), 0.22);
  box-shadow: var(--pl-shadow-lg);
}

/* El desplazamiento y el zoom son decorativos: se apagan con movimiento reducido. */
@media (prefers-reduced-motion: no-preference) {
  .personaje-card__media {
    transition: transform var(--pl-duration-slow) var(--pl-ease-standard);
  }

  .personaje-card__link i {
    transition: transform var(--pl-duration-base) var(--pl-ease-standard);
  }

  .personaje-card:has(.personaje-card__link:hover) {
    transform: translateY(-2px);
  }

  .personaje-card:has(.personaje-card__link:hover) .personaje-card__media {
    transform: scale(1.04);
  }

  .personaje-card:has(.personaje-card__link:hover) .personaje-card__link i {
    transform: translateX(3px);
  }
}

.personaje-card:has(.personaje-card__link:focus-visible) {
  outline: 3px solid var(--pl-primary);
  outline-offset: 2px;
}

.personaje-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0.75rem 1.1rem 0;
  list-style: none;
}

.personaje-card__meta li {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  color: var(--pl-muted);
  background: var(--pl-surface-soft);
  box-shadow: inset 0 0 0 1px var(--pl-border);
  font-size: 0.76rem;
  font-weight: 650;
}

.personaje-card__meta i {
  color: var(--pl-primary-ink);
  font-size: 0.9em;
}

.personaje-card__content {
  flex: 1 1 auto;
  padding: 0.85rem 1.1rem 1rem;
}

.personaje-card__trasfondo {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  color: var(--pl-muted);
  font-size: 0.9rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.personaje-card__trasfondo :deep(p),
.personaje-card__trasfondo :deep(ul),
.personaje-card__trasfondo :deep(ol) {
  margin: 0;
}

.personaje-card__sin-trasfondo {
  margin: 0;
  color: var(--pl-muted);
  font-size: 0.9rem;
  font-style: italic;
}

.personaje-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.85rem 1.1rem 1.1rem;
  border-top: 1px solid var(--pl-border);
  background: var(--pl-surface-soft);
}

:slotted(.pl-btn) {
  flex: 1 1 auto;
}
</style>

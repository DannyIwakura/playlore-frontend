<script setup lang="ts">
import { defineProps } from 'vue'

const props = withDefaults(defineProps<{ logeado?: boolean }>(), {
  logeado: false,
})
</script>

<template>
  <footer class="pl-footer">
    <div class="container pl-footer-inner">
      <div>
        <router-link to="/" class="pl-footer-brand">
          <img src="../assets/img/lOGOpLAYlORE.png" alt="PlayLore" />
          <span>PlayLore</span>
        </router-link>
        <p>
          PlayLore es el lugar donde roleplayers y escritores pueden encontrar su comunidad,
          compartir historias y vivir aventuras únicas.
        </p>
      </div>

      <nav v-if="!props.logeado" class="pl-footer-links-col" aria-label="Enlaces públicos">
        <p class="pl-footer-title">Explora</p>
        <ul class="pl-footer-links">
          <li><router-link to="/">Inicio</router-link></li>
          <li><router-link to="/#sobre">Qué es PlayLore</router-link></li>
          <li><router-link to="/#join">Cómo entrar</router-link></li>
        </ul>
      </nav>

      <nav v-else class="pl-footer-links-col" aria-label="Enlaces de usuario">
        <p class="pl-footer-title">Tu espacio</p>
        <ul class="pl-footer-links">
          <li><router-link to="/dashboard">Dashboard</router-link></li>
          <li><router-link to="/personajes">Personajes</router-link></li>
          <li><router-link to="/amigos">Amigos</router-link></li>
        </ul>
      </nav>
    </div>

    <div class="container pl-footer-bottom">
      © {{ new Date().getFullYear() }} PlayLore. Todos los derechos reservados.
    </div>
  </footer>
</template>

<style scoped>
.pl-footer {
  position: relative;
  margin-top: 4rem;
  color: rgba(255, 255, 255, 0.72);
  background: linear-gradient(135deg, #172033, #202b4a);
}

.pl-footer-inner {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 2.5rem;
  padding-top: 3.5rem;
  padding-bottom: 2rem;
}

.pl-footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #fff;
  font-size: 1.15rem;
  font-weight: 850;
  letter-spacing: -0.04em;
}

.pl-footer-brand:hover {
  color: #fff;
}

.pl-footer-brand img {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.pl-footer p {
  max-width: 520px;
  margin: 0.85rem 0 0;
  color: rgba(255, 255, 255, 0.66);
}

.pl-footer-title {
  margin-bottom: 0.85rem;
  color: #fff;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pl-footer-links {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pl-footer-links a {
  color: rgba(255, 255, 255, 0.72);
  transition: color 0.15s ease, transform 0.15s ease;
}

.pl-footer-links a:hover {
  color: #fff;
  transform: translateX(2px);
}

.pl-footer-bottom {
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.82rem;
}

@media (max-width: 767.98px) {
  .pl-footer-inner {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding-top: 3rem;
  }
}
</style>

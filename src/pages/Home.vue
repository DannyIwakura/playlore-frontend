<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Carousel } from 'bootstrap'
import NavBar from '../components/NavBar.vue'
import Footer from '../components/Footer.vue'
import carrusel from '../assets/img/carrusel1.jpg'
import carrusel2 from '../assets/img/carrusel2.jpg'
import carrusel3 from '../assets/img/carrusel3.jpg'

const carouselEl = ref<HTMLElement | null>(null)
let carouselInstance: Carousel | null = null

onMounted(async () => {
  if (!carouselEl.value) return
  const { Carousel } = await import('bootstrap')
  carouselInstance = new Carousel(carouselEl.value, { interval: 5000 })
})

onBeforeUnmount(() => {
  carouselInstance?.dispose()
  carouselInstance = null
})
</script>

<template>
  <NavBar :logeado="false" />

  <main class="pl-page pl-section-soft">
    <section class="pl-hero" aria-labelledby="hero-title">
      <div ref="carouselEl" id="carouselHero" class="carousel slide" data-bs-ride="carousel" data-bs-interval="5000">
        <div class="carousel-indicators">
          <button type="button" data-bs-target="#carouselHero" data-bs-slide-to="0" class="active" aria-label="Ir a la diapositiva 1"></button>
          <button type="button" data-bs-target="#carouselHero" data-bs-slide-to="1" aria-label="Ir a la diapositiva 2"></button>
          <button type="button" data-bs-target="#carouselHero" data-bs-slide-to="2" aria-label="Ir a la diapositiva 3"></button>
        </div>

        <div class="carousel-inner">
          <div class="carousel-item active">
            <img
              :src="carrusel"
              class="pl-hero-image"
              alt="Comunidad de roleplayers de PlayLore"
              fetchpriority="high"
              decoding="async"
            />
            <div class="pl-hero-overlay"></div>
            <div class="pl-hero-content">
              <span class="pl-hero-badge">Una comunidad, infinitas historias</span>
              <h1 id="hero-title">Tu próxima aventura comienza aquí</h1>
              <p class="pl-lead">
                Encuentra roleplayers, crea personajes memorables y vive aventuras épicas junto a una comunidad que comparte tu pasión.
              </p>
              <div class="pl-hero-actions">
                <router-link to="/registro" class="pl-btn pl-btn--primary">
                  <i class="bi bi-rocket-takeoff-fill me-1" aria-hidden="true"></i>Crear mi cuenta
                </router-link>
                <router-link to="/personajes/buscar" class="pl-btn pl-btn--secondary">
                  <i class="bi bi-search me-1" aria-hidden="true"></i>Explorar personajes
                </router-link>
              </div>
              <div class="pl-hero-meta" aria-label="Características principales">
                <span><i class="bi bi-people-fill" aria-hidden="true"></i>Comunidad activa</span>
                <span><i class="bi bi-person-vcard-fill" aria-hidden="true"></i>Personajes personalizables</span>
                <span><i class="bi bi-chat-dots-fill" aria-hidden="true"></i>Chat por canales</span>
              </div>
            </div>
          </div>

          <div class="carousel-item">
            <img
              :src="carrusel2"
              class="pl-hero-image"
              alt="Creación de personajes personalizables"
              fetchpriority="low"
              decoding="async"
            />
            <div class="pl-hero-overlay"></div>
            <div class="pl-hero-content">
              <span class="pl-hero-badge">Crea tu héroe</span>
              <h2 class="pl-title pl-gradient-text">Diseña un personaje que parezca real</h2>
              <p class="pl-lead">
                Combina historia, atributos, habilidades e imagen para dar vida a personajes únicos dentro de cualquier mundo.
              </p>
              <div class="pl-hero-actions">
                <router-link to="/personajes/crear" class="pl-btn pl-btn--primary">
                  <i class="bi bi-person-plus-fill me-1" aria-hidden="true"></i>Crear personaje
                </router-link>
                <router-link to="/personajes" class="pl-btn pl-btn--secondary">
                  <i class="bi bi-grid me-1" aria-hidden="true"></i>Mis personajes
                </router-link>
              </div>
            </div>
          </div>

          <div class="carousel-item">
            <img
              :src="carrusel3"
              class="pl-hero-image"
              alt="Conexión con otros roleplayers"
              fetchpriority="low"
              decoding="async"
            />
            <div class="pl-hero-overlay"></div>
            <div class="pl-hero-content">
              <span class="pl-hero-badge">Escribe juntos</span>
              <h2 class="pl-title pl-gradient-text">Conecta y escribe aventuras en tiempo real</h2>
              <p class="pl-lead">
                Únete a canales, encuentra compañeros de rol y convierte tus ideas en historias compartidas.
              </p>
              <div class="pl-hero-actions">
                <router-link to="/registro" class="pl-btn pl-btn--primary">
                  <i class="bi bi-chat-heart-fill me-1" aria-hidden="true"></i>Unirme al chat
                </router-link>
                <router-link to="/#sobre" class="pl-btn pl-btn--secondary">
                  <i class="bi bi-info-circle-fill me-1" aria-hidden="true"></i>Saber más
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <button class="carousel-control-prev" type="button" data-bs-target="#carouselHero" data-bs-slide="prev" aria-label="Anterior">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carouselHero" data-bs-slide="next" aria-label="Siguiente">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
        </button>
      </div>
    </section>

    <section id="sobre" class="pl-section">
      <div class="container">
        <div class="row align-items-center g-4">
          <div class="col-lg-6">
            <span class="pl-kicker">Hecho para creadores</span>
            <h2 class="pl-title">Más que una web, tu espacio para crear</h2>
            <p class="pl-lead">
              PlayLore reúne herramientas, comunidad y libertad creativa en un solo lugar. Desde la primera frase hasta la última escena, todo está pensado para que tu historia avance.
            </p>
            <div class="pl-proof-row">
              <span><strong>100%</strong> centrado en roleplay</span>
              <span><strong>Siempre activo</strong> por la comunidad</span>
              <span><strong>Tu historia</strong> bajo tu control</span>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="pl-card pl-card-hover pl-feature-card pl-visual-card">
              <img
                src="../assets/img/playlore_right.jpg"
                alt="Ilustración de la comunidad PlayLore"
                class="pl-visual-image"
                loading="lazy"
                decoding="async"
              />
              <div class="pl-visual-overlay">
                <span class="pl-icon-tile pl-icon-tile--cyan"><i class="bi bi-stars" aria-hidden="true"></i></span>
                <h3>Crea sin límites</h3>
                <p>Personajes, mundos y conversaciones con un diseño pensado para inspirar.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="pl-section pl-section-white">
      <div class="container">
        <div class="pl-page-header text-center mx-auto">
          <span class="pl-kicker">Todo en un solo lugar</span>
          <h2 class="pl-title">La comunidad escribe, tú lideras la escena</h2>
          <p class="pl-lead">
            Descubre herramientas diseñadas para roleplayers y escritores que quieren pasar de la idea a la historia.
          </p>
        </div>
        <div class="pl-feature-grid">
          <article class="pl-card pl-card-hover pl-feature-card">
            <span class="pl-icon-tile"><i class="bi bi-person-badge-fill" aria-hidden="true"></i></span>
            <h3>Personajes con identidad</h3>
            <p>Crea fichas detalladas, añade imágenes y organiza tus personajes por mundos y categorías.</p>
          </article>
          <article class="pl-card pl-card-hover pl-feature-card">
            <span class="pl-icon-tile pl-icon-tile--cyan"><i class="bi bi-chat-square-heart-fill" aria-hidden="true"></i></span>
            <h3>Conversaciones vivas</h3>
            <p>Chatea por canales, envía mensajes privados y mantén activa la presencia de tu comunidad.</p>
          </article>
          <article class="pl-card pl-card-hover pl-feature-card">
            <span class="pl-icon-tile pl-icon-tile--success"><i class="bi bi-people-fill" aria-hidden="true"></i></span>
            <h3>Comunidad conectada</h3>
            <p>Encuentra amigos, compañeros de rol y nuevas historias para escribir juntos.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="join" class="pl-section">
      <div class="container">
        <div class="pl-card pl-card-hover pl-join-card">
          <div class="pl-join-content">
            <span class="pl-kicker">Tu historia empieza ahora</span>
            <h2 class="pl-title">Únete a la comunidad</h2>
            <p class="pl-lead">
              Crea tu cuenta en pocos minutos y empieza a construir tu lugar dentro de PlayLore.
            </p>
            <div class="pl-hero-actions">
              <router-link to="/registro" class="pl-btn pl-btn--primary">
                <i class="bi bi-emoji-smile-fill me-1" aria-hidden="true"></i>Registrarme gratis
              </router-link>
              <router-link to="/login" class="pl-btn pl-btn--secondary">
                <i class="bi bi-box-arrow-in-right me-1" aria-hidden="true"></i>Acceder
              </router-link>
            </div>
          </div>
          <div class="pl-join-orbit" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </section>
  </main>

  <Footer :logeado="false" />
</template>

<style scoped>
/* El hero es full-bleed: va pegado a la navbar y sin esquinas
   redondeadas arriba, que dejarian ver el fondo claro de la pagina. */
.pl-page {
  padding-top: 0;
}

.pl-hero {
  border-radius: 0 0 1.25rem 1.25rem;
}

/* El hero llena la pantalla: alto del viewport menos la navbar sticky
   (76px en escritorio, 68px en tablet y 62px en movil). */
.pl-hero,
.pl-hero-content {
  min-height: calc(100svh - 76px);
}

@media (max-width: 991.98px) {
  .pl-hero,
  .pl-hero-content {
    min-height: calc(100svh - 68px);
  }
}

@media (max-width: 575.98px) {
  .pl-hero,
  .pl-hero-content {
    min-height: calc(100svh - 62px);
  }
}

/* Bootstrap hace clicable toda la franja lateral del 15% del carrusel, que
   se come los botones del hero. Solo la flecha debe recibir el clic. */
.pl-hero .carousel-control-prev,
.pl-hero .carousel-control-next {
  pointer-events: none;
}

.pl-hero .carousel-control-prev-icon,
.pl-hero .carousel-control-next-icon {
  width: 2.75rem;
  height: 2.75rem;
  background-size: 2rem 2rem;
  pointer-events: auto;
}

.pl-visual-card {
  position: relative;
  min-height: 420px;
  overflow: hidden;
}

.pl-visual-image {
  width: 100%;
  height: 100%;
  min-height: 420px;
  object-fit: cover;
}

.pl-visual-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1.5rem;
  color: #fff;
  background: linear-gradient(180deg, rgba(23, 32, 51, 0.05), rgba(23, 32, 51, 0.86));
}

.pl-visual-overlay h3 {
  margin-bottom: 0.45rem;
  font-size: 1.25rem;
}

.pl-visual-overlay p {
  margin-bottom: 0;
  color: rgba(255, 255, 255, 0.78);
}

.pl-join-card {
  position: relative;
  overflow: hidden;
  padding: clamp(2rem, 6vw, 4.5rem);
  color: #fff;
  background: linear-gradient(135deg, #151b2c 0%, #24243d 100%);
  box-shadow: var(--pl-shadow-lg);
}

.pl-join-card::before {
  position: absolute;
  top: -160px;
  right: -100px;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--pl-cyan-rgb), 0.22), transparent 72%);
  content: "";
}

.pl-join-content {
  position: relative;
  z-index: 1;
  max-width: 650px;
}

.pl-join-content .pl-kicker {
  color: rgba(255, 255, 255, 0.88);
}

.pl-join-content .pl-title {
  color: #fff;
}

.pl-join-content .pl-lead {
  max-width: 580px;
  color: rgba(255, 255, 255, 0.76);
}

.pl-join-content .pl-hero-actions {
  margin-top: 1.75rem;
}

.pl-join-content .pl-btn--secondary {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.24);
}

.pl-join-content .pl-btn--secondary:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
}

.pl-join-orbit {
  position: absolute;
  right: 8%;
  bottom: -90px;
  width: 360px;
  height: 360px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
}

.pl-join-orbit span {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
}

.pl-join-orbit span:nth-child(1) {
  inset: 35px;
}

.pl-join-orbit span:nth-child(2) {
  inset: 75px;
}

.pl-join-orbit span:nth-child(3) {
  inset: 115px;
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 991.98px) {
  .pl-feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pl-visual-card,
  .pl-visual-image {
    min-height: 360px;
  }
}

@media (max-width: 767.98px) {
  .pl-feature-grid {
    grid-template-columns: 1fr;
  }

  .pl-visual-card,
  .pl-visual-image {
    min-height: 300px;
  }

  .pl-join-card {
    padding: 2rem 1.25rem;
  }

  .pl-join-orbit {
    right: -120px;
    opacity: 0.55;
  }
}

@media (max-width: 575.98px) {
  .pl-hero-content {
    padding: 1.75rem 1.15rem;
  }

  .pl-hero-actions {
    margin-top: 1.4rem;
  }

  .pl-hero-meta {
    margin-top: 1.75rem;
  }

  .pl-visual-card,
  .pl-visual-image {
    min-height: 280px;
  }

  .pl-join-orbit {
    display: none;
  }
}
</style>

<script setup lang="ts">
import NavBar from '../components/NavBar.vue';
import Footer from '../components/Footer.vue';
import carrusel from '../assets/img/carrusel1.jpg'
import carrusel2 from '../assets/img/carrusel2.jpg'
import carrusel3 from '../assets/img/carrusel3.jpg'
</script>

<template>
  <NavBar :logeado="false" />
  <div id="carouselHero" class="carousel slide" data-bs-ride="carousel" data-bs-interval="5000">
    
    <!-- Indicadores -->
    <div class="carousel-indicators">
      <button type="button" data-bs-target="#carouselHero" data-bs-slide-to="0" class="active"></button>
      <button type="button" data-bs-target="#carouselHero" data-bs-slide-to="1"></button>
      <button type="button" data-bs-target="#carouselHero" data-bs-slide-to="2"></button>
    </div>

    <!-- Slides -->
    <div class="carousel-inner">

      <!-- Slide 1 -->
      <div class="carousel-item active position-relative">
        <img :src="carrusel" class="d-block w-100" />

        <!-- Overlay oscuro -->
        <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>

        <!-- Texto centrado -->
        <div class="carousel-caption top-50 start-50 translate-middle text-center">
          <h1 class="display-2 fw-bold text-white text-uppercase" style="text-shadow: 2px 2px 15px black;">
            LA APLICACIÓN QUE REÚNE A ROLEPLAYERS Y A ESCRITORES
          </h1>
          <p class="lead text-light">
            PlayRole está pensada para que los amantes del roleplay puedan encontrar su lugar, compartir sus historias y vivir aventuras épicas juntos, con catacterísticas que te ayudarán a expresar tu creatividad.
          </p>
        </div>
      </div>

      <!-- Slide 2 -->
      <div class="carousel-item position-relative">
        <img :src="carrusel2" class="d-block w-100" />

        <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>

        <div class="carousel-caption top-50 start-50 translate-middle text-center">
          <h1 class="display-2 fw-bold text-white text-uppercase" style="text-shadow: 2px 2px 15px black;">
            CREA FICHAS DE PERSONAJES PERSONALIZABLES Y SIN LÍMITES
          </h1>
          <p class="lead text-light">
            Saca tu lado más creativo y diseña personajes únicos con nuestras fichas personalizables. Desde atributos hasta habilidades, puedes crear personajes que se adapten a cualquier mundo o historia que imagines.
          </p>
        </div>
      </div>

      <!-- Slide 3 -->
      <div class="carousel-item position-relative">
        <img :src="carrusel3" class="d-block w-100" />

        <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>

        <div class="carousel-caption top-50 start-50 translate-middle text-center">
          <h1 class="display-2 fw-bold text-white text-uppercase" style="text-shadow: 2px 2px 15px black;">
            CONECTA CON GENTE CON TUS MISMOS INTERESES Y VIVE AVENTURAS ÉPICAS JUNTOS
          </h1>
          <p class="lead text-light">
            Nuestro sistema de mensajes privados permite conectar a roleplayers y escritores de todo el mundo. Encuentra compañeros de juego, comparte tus historias y vive aventuras épicas juntos, sin importar dónde estés.
          </p>
        </div>
      </div>

    </div>

    <!-- Controles -->
    <button class="carousel-control-prev" type="button" data-bs-target="#carouselHero" data-bs-slide="prev">
      <span class="carousel-control-prev-icon"></span>
    </button>

    <button class="carousel-control-next" type="button" data-bs-target="#carouselHero" data-bs-slide="next">
      <span class="carousel-control-next-icon"></span>
    </button>
  </div>

<!-- Sección de Sobre -->
 <section id="sobre" class="hero-section d-flex align-items-center">
    <div class="container h-100">
      <div class="row h-100">
        <div class="col-md-6 d-flex align-items-center">
          <div class="content-box p-4">
            <h1 class="display-3 fw-bold mb-3">PlayLore: Este es tu lugar</h1>
            <p class="lead">
              Bienvenido a PlayLore, el lugar donde puedes descubrir, jugar y compartir experiencias únicas con nuestra comunidad.
            </p>
          </div>
        </div>

        <!-- Lado derecho: imagen -->
        <div class="col-md-6 d-flex justify-content-center align-items-center">
          <img src="../assets/img/playlore_right.jpg" class="img-fluid" alt="Ilustración lateral">
        </div>

      </div>
    </div>
  </section>

  <!-- Sección de Unirse -->
  <section id="join" class="join-section d-flex align-items-center justify-content-center text-center">
    <div class="content">
      <h1 class="display-3 fw-bold mb-3">ÚNETE HOY MISMO</h1>
      <p class="lead mb-4">
        Forma parte de nuestra comunidad y disfruta de escribiendo junto a otros roleplayers. No esperes más para empezar tu aventura.
      </p>
      <router-link to="/registro" class="btn btn-dark btn-lg">
        Únete ahora
      </router-link>
    </div>
  </section>
  <Footer :logeado="false"/>

</template>

<style>
/* PAra que el carruser ocupe toda la altura */
.carousel-item img {
  height: 100vh;
  object-fit: cover;
}

/* Imagen de fondo para la sección de Sobre */
.hero-section {
  height: 100vh;
  width: 100%;
  background-image: url('../assets/img/playlore_bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}
/* marco semitransparente */
.content-box {
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 15px;
  color: #fff;
}

@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
  }
  .content-box {
    margin-bottom: 20px;
  }
}

.join-section {
  height: 100vh;
  background-color: #adb1e5;
}

.join-section .content {
  max-width: 600px;
}
</style>
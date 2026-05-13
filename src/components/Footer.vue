<script setup lang="ts">

const props = defineProps<{ logeado?: boolean }>()
console.log('logeado en footer:', props.logeado)

</script>


<template>
  <footer class="bg-dark text-white pt-4 pb-3">
    <div class="container">
      <div class="row align-items-center">
        
        <!-- Logo a la izquierda -->
       <div class="col-md-6 mb-3 mb-md-0">
           <a class="navbar-brand" href="/">
              <img 
                src="../assets/img/lOGOpLAYlORE.png"
                alt="PlayLole" 
                height="80"
                class="d-inline-block align-text-top"
              >
            </a>

          <p class="small text-secondary mt-1 mb-0">
            PlayRole está pensada para que los amantes del roleplay puedan encontrar su lugar,
            compartir sus historias y vivir aventuras épicas juntos, con características
            que te ayudarán a expresar tu creatividad.
          </p>
      </div>

        <!-- Enlaces a la derecha -->
        <div class="col-md-6 d-flex justify-content-md-end">
          <ul class="list-unstyled mb-0" v-if="!props.logeado">
            <li class="ms-3"><a href="#" class="text-white text-decoration-none mb-2">Inicio</a></li>
            <li class="ms-3"><a href="#" class="text-white text-decoration-none mb-2">Qué es PlayLore</a></li>
            <li class="ms-3"><a href="#" class="text-white text-decoration-none">Cómo entrar</a></li>
          </ul>
        </div>

      </div>

      <!-- Línea inferior con derechos -->
      <div class="row mt-3">
        <div class="col text-center">
          <small>© {{ new Date().getFullYear() }} Todo los derechos reservados.</small>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
footer a:hover {
  text-decoration: underline;
}
</style>
<script setup lang="ts">
import Footer from '../components/Footer.vue';
import NavBar from '../components/NavBar.vue';


</script>

<template>
    <NavBar 
    :logeado="true"
    />

    <section class="container mt-5">
        <h1>Bienvenido [Usuario] al Dashboard</h1>
        <p>Aquí podrás gestionar tus personajes, aventuras y mensajes privados.</p>
    </section>

    <!-- Sección de Noticias -->
    <section class="container mt-4">
        <h2>Noticias</h2>
        <div class="row">
            <div class="col-md-4 mb-3">
                <div class="card">
                    <img src="../assets/img/carrusel1.jpg" class="card-img-top" alt="Noticia 1">
                    <div class="card-body">
                        <h5 class="card-title">Título de la Noticia 1</h5>
                        <p class="card-text">Breve descripción de la noticia...</p>
                        <a href="#" class="btn btn-primary">Leer más</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card">
                    <img src="../assets/img/carrusel2.jpg" class="card-img-top" alt="Noticia 2">
                    <div class="card-body">
                        <h5 class="card-title">Título de la Noticia 2</h5>
                        <p class="card-text">Breve descripción de la noticia...</p>
                        <a href="#" class="btn btn-primary">Leer más</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card">
                    <img src="../assets/img/carrusel3.jpg" class="card-img-top" alt="Noticia 3">
                    <div class="card-body">
                        <h5 class="card-title">Título de la Noticia 3</h5>
                        <p class="card-text">Breve descripción de la noticia...</p>
                        <a href="#" class="btn btn-primary">Leer más</a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Sección de Mensajes Recientes -->
    <section class="container mt-4">
        <h2>Mensajes Recientes</h2>
        <div class="row">
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Asunto del Mensaje 1</h5>
                        <p class="card-text">Contenido resumido del mensaje...</p>
                        <small class="text-muted">Enviado por: Usuario1</small>
                        <a href="#" class="btn btn-primary float-end">Ver mensaje</a>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Asunto del Mensaje 2</h5>
                        <p class="card-text">Contenido resumido del mensaje...</p>
                        <small class="text-muted">Enviado por: Usuario2</small>
                        <a href="#" class="btn btn-primary float-end">Ver mensaje</a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <Footer />
</template>

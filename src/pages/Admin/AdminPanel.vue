<script setup lang="ts">
import { ref } from 'vue'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import CategoriasLista from '../Admin/Categorias/CategoriasLista.vue'
import CategoriaNueva from '../Admin/Categorias/CategoriaNueva.vue'
import { userStore } from '../../store/userStore'
import UsuariosLista from '../Admin/Usuarios/UsuariosLista.vue'
import PersonajesLista from '../Admin/Personajes/PersonajesLista.vue'
import DenunciasLista from '../Admin/Denuncias/DenunciasLista.vue'
import BaneosLista from '../Admin/Baneos/BaneosLista.vue'
import AuditoriaLista from '../Admin/Auditoria/AuditoriaLista.vue'

const usuario = userStore.usuario
const esAdmin = usuario.value?.role === 'ADMIN'
const esModerador = usuario.value?.role === 'MOD'

// Si es moderador, la pestaña inicial será personajes
const pestanaActiva = ref(esAdmin ? 'categorias' : 'personajes')
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Administración</span>
        <h1 class="pl-title">Panel de administrador</h1>
        <p class="pl-lead">
          Bienvenido, {{ userStore.usuario.value?.username }}. Gestiona el contenido de la plataforma.
        </p>
      </header>

      <div class="row g-4">

        <!-- SIDEBAR IZQUIERDO -->
        <div class="col-lg-3">
          <nav class="card admin-nav" aria-label="Secciones de administración">
            <h2 class="admin-nav-title">Secciones</h2>

            <button
              type="button"
              v-if="esAdmin"
              class="admin-nav-item"
              :class="{ 'admin-nav-item--active': pestanaActiva === 'categorias' }"
              @click="pestanaActiva = 'categorias'"
            >
              <i class="bi bi-tags" aria-hidden="true"></i> Gestión de categorías
            </button>

            <button
              type="button"
              v-if="esAdmin"
              class="admin-nav-item"
              :class="{ 'admin-nav-item--active': pestanaActiva === 'usuarios' }"
              @click="pestanaActiva = 'usuarios'"
            >
              <i class="bi bi-people" aria-hidden="true"></i> Gestión de usuarios
            </button>

            <button
              type="button"
              v-if="esAdmin || esModerador"
              class="admin-nav-item"
              :class="{ 'admin-nav-item--active': pestanaActiva === 'personajes' }"
              @click="pestanaActiva = 'personajes'"
            >
              <i class="bi bi-person-badge" aria-hidden="true"></i> Gestión de personajes
            </button>

            <button
              type="button"
              v-if="esAdmin || esModerador"
              class="admin-nav-item"
              :class="{ 'admin-nav-item--active': pestanaActiva === 'denuncias' }"
              @click="pestanaActiva = 'denuncias'"
            >
              <i class="bi bi-flag" aria-hidden="true"></i> Denuncias
            </button>

            <button
              type="button"
              v-if="esAdmin || esModerador"
              class="admin-nav-item"
              :class="{ 'admin-nav-item--active': pestanaActiva === 'baneos' }"
              @click="pestanaActiva = 'baneos'"
            >
              <i class="bi bi-hammer" aria-hidden="true"></i> Baneos globales
            </button>

            <button
              type="button"
              v-if="esAdmin || esModerador"
              class="admin-nav-item"
              :class="{ 'admin-nav-item--active': pestanaActiva === 'auditoria' }"
              @click="pestanaActiva = 'auditoria'"
            >
              <i class="bi bi-journal-text" aria-hidden="true"></i> Auditoría de moderación
            </button>
          </nav>
        </div>

        <!-- CONTENIDO DERECHO -->
        <div class="col-lg-9">
          <div v-if="pestanaActiva === 'categorias'" class="admin-section">
            <h2 class="admin-section-title">Gestión de categorías</h2>
            <CategoriasLista />
            <hr class="pl-divider" />
            <h3 class="admin-section-subtitle">Nueva categoría</h3>
            <CategoriaNueva />
          </div>

          <div v-if="pestanaActiva === 'usuarios'" class="admin-section">
            <h2 class="admin-section-title">Gestión de usuarios</h2>
            <UsuariosLista />
          </div>

          <div v-if="pestanaActiva === 'personajes' && (esAdmin || esModerador)" class="admin-section">
            <h2 class="admin-section-title">Gestión de personajes</h2>
            <PersonajesLista />
          </div>

          <div v-if="pestanaActiva === 'denuncias' && (esAdmin || esModerador)" class="admin-section">
            <h2 class="admin-section-title">Denuncias</h2>
            <DenunciasLista />
          </div>

          <div v-if="pestanaActiva === 'baneos' && (esAdmin || esModerador)" class="admin-section">
            <h2 class="admin-section-title">Baneos globales</h2>
            <BaneosLista />
          </div>

          <div v-if="pestanaActiva === 'auditoria' && (esAdmin || esModerador)" class="admin-section">
            <h2 class="admin-section-title">Auditoría de moderación</h2>
            <AuditoriaLista />
          </div>
        </div>

      </div>
    </div>
  </main>

  <Footer />
</template>

<style scoped>
.admin-nav {
  position: sticky;
  top: 1.5rem;
  padding: 1rem;
}

.admin-nav-title {
  margin: 0 0 0.75rem;
  padding: 0 0.5rem 0.75rem;
  border-bottom: 1px solid var(--pl-border);
  color: var(--pl-muted);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  margin-bottom: 0.35rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--pl-radius-md);
  background: transparent;
  color: var(--pl-muted);
  font-size: 0.9rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.admin-nav-item:hover {
  background: var(--pl-surface-soft);
  color: var(--pl-primary);
}

.admin-nav-item--active {
  color: #fff;
  background: var(--pl-primary);
  box-shadow: var(--pl-shadow-sm);
}

.admin-nav-item--active:hover {
  color: #fff;
  background: var(--pl-primary-dark);
}

.admin-section-title {
  margin-bottom: 1.25rem;
  color: var(--pl-ink);
  font-size: 1.5rem;
  font-weight: 850;
  letter-spacing: -0.03em;
}

.admin-section-subtitle {
  margin: 0 0 0.75rem;
  color: var(--pl-ink);
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
</style>
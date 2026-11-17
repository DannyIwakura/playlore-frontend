<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { seccionInicial, seccionesVisibles } from './adminSecciones'

const route = useRoute()
const router = useRouter()

const rol = computed(() => userStore.usuario.value?.role ?? null)
const secciones = computed(() => seccionesVisibles(rol.value))

const seccionActiva = ref(seccionInicial(rol.value, route.hash))
const seccionActual = computed(
  () => secciones.value.find((seccion) => seccion.id === seccionActiva.value) ?? secciones.value[0] ?? null
)

const tituloRef = ref<HTMLElement | null>(null)

// El alta de categorías vive en su propio componente con modal compartido; el
// botón de la cabecera lo abre por ref y el listado anuncia y recarga el alta.
const categoriasListaRef = ref<InstanceType<typeof CategoriasLista> | null>(null)
const categoriaNuevaRef = ref<InstanceType<typeof CategoriaNueva> | null>(null)

// El guard del router ya limita /admin a ADMIN y MOD, pero el token se carga de
// forma asíncrona: si el rol llega después del primer render, recolocamos la
// sección activa en la primera que ese rol pueda ver.
watch(rol, (nuevoRol) => {
  if (!secciones.value.some((seccion) => seccion.id === seccionActiva.value)) {
    seccionActiva.value = seccionInicial(nuevoRol, route.hash)
  }
})

async function cambiarSeccion(id: string) {
  if (id === seccionActiva.value) return
  seccionActiva.value = id

  // El hash conserva la sección al recargar y permite enlazarla; el router
  // desplaza con su scrollBehavior, que ya respeta prefers-reduced-motion.
  void router.replace({ hash: `#${id}` })
  await nextTick()
  // preventScroll evita competir con el desplazamiento suave del router.
  tituloRef.value?.focus({ preventScroll: true })
}

onMounted(() => {
  // Con un hash válido la sección se abre directamente; si no, el panel
  // arranca arriba y no reescribe la URL para no forzar un desplazamiento.
  if (route.hash) seccionActiva.value = seccionInicial(rol.value, route.hash)
})
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Administración</span>
        <h1 class="pl-title">Panel de administración</h1>
        <p class="pl-lead">
          Hola, {{ userStore.usuario.value?.username }}. Revisa denuncias, modera personajes y
          gestiona la plataforma desde un solo lugar.
        </p>
      </header>

      <div v-if="secciones.length" class="pl-admin-layout">
        <nav class="pl-admin-nav" aria-label="Secciones de administración">
          <p class="pl-admin-nav__titulo">Secciones</p>
          <ul class="pl-admin-nav__lista">
            <li v-for="seccion in secciones" :key="seccion.id">
              <button
                type="button"
                class="pl-admin-nav__item"
                :aria-current="seccionActiva === seccion.id ? 'page' : undefined"
                @click="cambiarSeccion(seccion.id)"
              >
                <i class="bi" :class="seccion.icono" aria-hidden="true"></i>
                <span class="pl-admin-nav__texto">{{ seccion.etiqueta }}</span>
              </button>
            </li>
          </ul>
        </nav>

        <section
          v-if="seccionActual"
          :id="seccionActiva"
          class="pl-admin-panel"
          aria-labelledby="admin-seccion-titulo"
        >
          <header class="pl-admin-panel__cabecera">
            <div class="pl-admin-panel__introduccion">
              <h2 id="admin-seccion-titulo" ref="tituloRef" class="pl-admin-panel__titulo" tabindex="-1">
                {{ seccionActual.etiqueta }}
              </h2>
              <p class="pl-admin-panel__ayuda">{{ seccionActual.descripcion }}</p>
            </div>
            <div v-if="seccionActiva === 'categorias'" class="pl-admin-panel__acciones">
              <button
                type="button"
                class="pl-btn pl-btn--primary"
                @click="categoriaNuevaRef?.abrir()"
              >
                <i class="bi bi-plus-lg" aria-hidden="true"></i>
                Nueva categoría
              </button>
            </div>
          </header>

          <div class="pl-admin-panel__cuerpo">
            <DenunciasLista v-if="seccionActiva === 'denuncias'" />
            <PersonajesLista v-else-if="seccionActiva === 'personajes'" />
            <BaneosLista v-else-if="seccionActiva === 'baneos'" />
            <AuditoriaLista v-else-if="seccionActiva === 'auditoria'" />
            <UsuariosLista v-else-if="seccionActiva === 'usuarios'" />
            <template v-else-if="seccionActiva === 'categorias'">
              <CategoriasLista ref="categoriasListaRef" />
              <CategoriaNueva
                ref="categoriaNuevaRef"
                :mostrar-boton="false"
                @creada="categoriasListaRef?.anunciarCreada($event)"
              />
            </template>
          </div>
        </section>
      </div>

      <div v-else class="pl-empty-state" role="status">
        <span class="pl-empty-state__icon"><i class="bi bi-shield-lock" aria-hidden="true"></i></span>
        <p class="mb-0">Esta cuenta no tiene acceso al panel de administración.</p>
      </div>
    </div>
  </main>

  <Footer />
</template>

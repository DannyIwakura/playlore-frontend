import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Login from '../pages/Login.vue';
import Registro from '../pages/Registro.vue';
import Dashboard from '../pages/Dashboard.vue';
import PersonajesList from '../pages/Personajes/PersonajesList.vue';
import NuevoPErsonajeForm from '../pages/Personajes/NuevoPersonajeForm.vue';
import EditarPersonajeForm from '../pages/Personajes/EditarPersonajeForm.vue';
import CategoriaNueva from '../pages/Admin/Categorias/CategoriaNueva.vue';
import CategoriasLista from '../pages/Admin/Categorias/CategoriasLista.vue';
import AdminPanel from '../pages/Admin/AdminPanel.vue';
import { userStore } from '../store/userStore';
import EditarFormulario from '../pages/Usuarios/EditarFormulario.vue';
import MensajesPrivadosList from '../pages/Mensajes Privados/MensajesPrivadosList.vue';
import PerfilUsuario from '../pages/Usuarios/PerfilUsuario.vue';
import PerfilPersonajeView from '../pages/Personajes/PerfilPersonajeView.vue';
import AmigosList from '../pages/Usuarios/AmigosList.vue';
import BuscarPersonaje from '../pages/Personajes/BuscarPersonajes.vue';

const routes = [
  //rutas públicas
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/registro', component: Registro },
  //rutas protegidas
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/usuario/editar/:id', component: EditarFormulario, meta: { requiresAuth: true } },
  { path: '/personajes', component: PersonajesList, meta: { requiresAuth: true } },
  { path: '/personajes/crear', component: NuevoPErsonajeForm, meta: { requiresAuth: true } },
  { path: '/personajes/editar/:id', component: EditarPersonajeForm, meta: { requiresAuth: true } },
  { path: '/personajes/categorias/:id', component: CategoriasLista, meta: { requiresAuth: true } },
  { path: '/personajes/buscar',component: BuscarPersonaje, meta: { requiresAuth: true } },
  { path: '/mensajes', component: MensajesPrivadosList, meta: { requiresAuth: true } },
  { path: '/perfil/:id', component: PerfilUsuario, meta: { requiresAuth: true } },
  { path: '/personaje/:id', component: PerfilPersonajeView, meta: { requiresAuth: true } },
  { path: '/amigos/', component: AmigosList, meta: { requiresAuth: true } },
  //rutas protegidas por roles
  { path: '/admin', component: AdminPanel, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/categorias', component: CategoriasLista, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/categorias/nueva', component: CategoriaNueva, meta: { requiresAuth: true, requiresAdmin: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

//verifica token antes de entrar a rutas protegidas
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');

  // Si el usuario está logueado y va a la raíz, redirige al dashboard
  if (to.path === '/' && token) {
    next('/dashboard');
    return;
  }

  // Rutas protegidas
  if (to.meta.requiresAuth && !token) {
    next('/login');
    return;
  }

  // Comprobación de rol ADMIN
  if (to.meta.requiresAdmin) {
    userStore.cargarDesdeToken();
    if (userStore.usuario.value?.role !== 'ADMIN') {
      next('/dashboard');
      return;
    }
  }

  next();
});

export default router;
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Login from '../pages/Login.vue';
import Registro from '../pages/Registro.vue';
import Dashboard from '../pages/Dashboard.vue';
import PersonajesList from '../pages/Personajes/PersonajesList.vue';
import NuevoPErsonajeForm from '../pages/Personajes/NuevoPersonajeForm.vue';
import EditarPersonajeForm from '../pages/Personajes/EditarPersonajeForm.vue';

const routes = [
  //rutas públicas
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/registro', component: Registro },
  //rutas protegidas
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/personajes', component: PersonajesList, meta: { requiresAuth: true } },
  { path: '/personajes/crear', component: NuevoPErsonajeForm, meta: { requiresAuth: true } },
  { path: '/personajes/editar/:id', component: EditarPersonajeForm, meta: { requiresAuth: true } },
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
  } else {
    next();
  }
});

export default router;
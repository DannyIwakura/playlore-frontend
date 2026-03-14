import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Login from '../pages/Login.vue';
import Registro from '../pages/Registro.vue';
import Dashboard from '../pages/Dashboard.vue';
import PersonajesList from '../pages/Personajes/PersonajesList.vue';
import NuevoPErsonajeForm from '../pages/Personajes/NuevoPErsonajeForm.vue';
import EditarPersonajeForm from '../pages/Personajes/EditarPersonajeForm.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/registro', component: Registro },
  { path: '/dashboard', component: Dashboard },
  { path: '/personajes', component: PersonajesList },
  { path: '/personajes/crear', component: NuevoPErsonajeForm },
  { path: '/personajes/editar/:id', component: EditarPersonajeForm },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
import { createRouter, createWebHistory } from 'vue-router';
import { userStore } from '../store/userStore';

const routes = [
  //rutas públicas
  { path: '/', component: () => import('../pages/Home.vue') },
  { path: '/login', component: () => import('../pages/Login.vue') },
  { path: '/registro', component: () => import('../pages/Registro.vue') },
  //rutas protegidas
  { path: '/dashboard', component: () => import('../pages/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/usuario/editar/:id', component: () => import('../pages/Usuarios/EditarFormulario.vue'), meta: { requiresAuth: true } },
  { path: '/personajes', component: () => import('../pages/Personajes/PersonajesList.vue'), meta: { requiresAuth: true } },
  { path: '/personajes/crear', component: () => import('../pages/Personajes/NuevoPersonajeForm.vue'), meta: { requiresAuth: true } },
  { path: '/personajes/editar/:id', component: () => import('../pages/Personajes/EditarPersonajeForm.vue'), meta: { requiresAuth: true } },
  { path: '/personajes/categorias/:id', component: () => import('../pages/Admin/Categorias/CategoriasLista.vue'), meta: { requiresAuth: true } },
  { path: '/personajes/buscar', component: () => import('../pages/Personajes/BuscarPersonajes.vue'), meta: { requiresAuth: true } },
  { path: '/perfil/:id', component: () => import('../pages/Usuarios/PerfilUsuario.vue'), meta: { requiresAuth: true } },
  { path: '/personaje/:id', component: () => import('../pages/Personajes/PerfilPersonajeView.vue'), meta: { requiresAuth: true } },
  { path: '/amigos/', component: () => import('../pages/Usuarios/AmigosList.vue'), meta: { requiresAuth: true } },
  //rutas de chat
  { path: '/chat', component: () => import('../pages/Chat/ChatWindow.vue'), meta: { requiresAuth: true } },
  // Los canales solo se gestionan desde /chat (todo el sistema de chat está ahí)
  { path: '/canales', redirect: '/chat' },
  { path: '/canales/:id', redirect: '/chat' },
  //rutas protegidas por roles
  { path: '/admin', component: () => import('../pages/Admin/AdminPanel.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/categorias', component: () => import('../pages/Admin/Categorias/CategoriasLista.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/categorias/nueva', component: () => import('../pages/Admin/Categorias/CategoriaNueva.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

//verifica token antes de entrar a rutas protegidas
router.beforeEach((to, _from, next) => {
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

  // Comprobación de rol ADMIN y MOD
  if (to.meta.requiresAdmin) {
    userStore.cargarDesdeToken();
    const role = userStore.usuario.value?.role
    if (role !== 'ADMIN' && role !== 'MOD') {
      next('/dashboard');
      return;
    }
  }
  next();
});

export default router;

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { userStore } from './store/userStore'

userStore.cargarDesdeToken()

createApp(App)
  .use(router)
  .mount('#app')
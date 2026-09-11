import { createApp } from 'vue'
import DOMPurify from 'dompurify'
import App from './App.vue'
import router from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './style.css'
import { userStore } from './store/userStore'

userStore.cargarDesdeToken()

const app = createApp(App)

const SANITIZE_URI_REGEX = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|profile):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: SANITIZE_URI_REGEX })
}

app.directive('sanitize', {
  mounted(el: HTMLElement, binding) {
    if (binding.value != null) {
      el.innerHTML = sanitizeHtml(String(binding.value))
    }
  },
  updated(el: HTMLElement, binding) {
    if (binding.value !== binding.oldValue) {
      el.innerHTML = sanitizeHtml(String(binding.value))
    }
  }
})

app.config.errorHandler = (err) => {
  console.error('[Global]', err)
}

app.use(router).mount('#app')
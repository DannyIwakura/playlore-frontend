<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

const container = ref<HTMLDivElement | null>(null)
const ready = ref(false)
const error = ref<string | null>(null)

let widgetId: number | null = null

onMounted(() => {
  const scriptLoaded = () => {
    if (container.value && (window as any).grecaptcha) {
      try {
        widgetId = (window as any).grecaptcha.render(container.value, {
          sitekey: SITE_KEY,
          theme: 'light'
        })
        ready.value = true
      } catch {
        error.value = 'Error al cargar el CAPTCHA'
      }
    } else {
      setTimeout(scriptLoaded, 300)
    }
  }
  if ((window as any).grecaptcha) {
    scriptLoaded()
  } else {
    const check = setInterval(() => {
      if ((window as any).grecaptcha) {
        clearInterval(check)
        scriptLoaded()
      }
    }, 300)
  }
})

onUnmounted(() => {
  if (widgetId !== null && (window as any).grecaptcha) {
    (window as any).grecaptcha.reset(widgetId)
  }
})

function getToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (widgetId === null || !(window as any).grecaptcha) {
      reject('El CAPTCHA aún no se ha cargado')
      return
    }
    const response = (window as any).grecaptcha.getResponse(widgetId)
    if (response) {
      resolve(response)
    } else {
      reject('Por favor, completa el CAPTCHA')
    }
  })
}

function reset() {
  if (widgetId !== null && (window as any).grecaptcha) {
    (window as any).grecaptcha.reset(widgetId)
  }
}

defineExpose({ getToken, reset, ready })
</script>

<template>
  <div class="mb-3">
    <div ref="container" class="g-recaptcha"></div>
    <div v-if="error" class="text-danger small mt-1">{{ error }}</div>
  </div>
</template>

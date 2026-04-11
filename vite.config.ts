import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  // Evitar problemas de dependencias duplicadas con Vue y TipTap
  resolve: {
    dedupe: ['vue', '@tiptap/core', '@tiptap/pm'],
  },

  optimizeDeps: {
    include: [
      '@tiptap/extension-text-style',
      '@tiptap/extension-color',
      '@tiptap/extension-link',
      '@tiptap/extension-image',
      '@tiptap/extension-text-align'
    ]
  },

  ssr: {
    noExternal: [
      '@tiptap/extension-text-style',
      '@tiptap/extension-color'
    ]
  },

  // configuracion necesaria para no tener que usar la ruta completa del back
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
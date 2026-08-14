import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig(
  mergeConfig(viteConfig, {
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.ts'],
      css: false,
    },
  }),
)

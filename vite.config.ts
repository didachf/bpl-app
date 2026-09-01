import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  // Ruta que sirve GitHub Pages para un repositorio que no es el sitio raiz.
  base: '/bpl-app/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

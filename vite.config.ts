import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

// Ruta que sirve GitHub Pages para un repositorio que no es el sitio raiz.
const BASE = '/bpl-app/'

export default defineConfig({
  base: BASE,
  plugins: [
    preact(),
    VitePWA({
      // `prompt` y no `autoUpdate`: con autoUpdate el service worker nuevo se
      // activa y recarga la pagina por su cuenta, y una recarga a media nota de
      // vuelo pierde lo que se estuviera escribiendo. Aqui la version nueva
      // espera y la aplica el usuario cuando le viene bien.
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Logbook BPL',
        short_name: 'Logbook',
        description: 'Cuaderno de vuelo en globo, planificacion y operaciones.',
        lang: 'es',
        // Absolutos con la base delante. Un start_url relativo hace que Chrome
        // instale la app apuntando a la raiz del dominio, que es de otro sitio.
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1a1a19',
        theme_color: '#1a1a19',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Android recorta el icono a la forma del lanzador. Sin un maskable,
          // Chrome mete el nuestro dentro de un circulo blanco.
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // El armazon entero, tipografias incluidas: la app tiene que arrancar
        // en un campo sin cobertura.
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: `${BASE}index.html`,
        // SIN runtimeCaching a proposito. La API de GitHub no se cachea nunca:
        // servir un logbook.json viejo de la cache haria creer que la copia
        // esta al dia cuando no lo esta, y podria disparar un conflicto falso.
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

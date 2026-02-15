import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: 'Rocco',
          short_name: 'Rocco',
          description: 'Your personal place list',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icons/favicon-196x196.png',
              sizes: '196x196',
              type: 'image/png',
            },
            {
              src: '/icons/favicon-128.png',
              sizes: '128x128',
              type: 'image/png',
            },
          ],
        },
        workbox: {
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        navigateFallback: '/',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
  optimizeDeps: {
    exclude: ['postgres'],
  },
  ssr: {
    noExternal: [/^@hominem\//],
  },
  build: {
    rollupOptions: {},
  },
  server: {
    port: 4446,
    strictPort: true,
  },
});

import path from 'node:path'

import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const authSource = path.resolve(import.meta.dirname, '../../packages/auth/src')

export default defineConfig(({ mode }) => ({
  build: {
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
    },
  },
  clearScreen: false,
  optimizeDeps: {
    force: mode === 'development',
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    VitePWA({
      outDir: 'build/client',
      registerType: 'prompt',
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Career',
        short_name: 'Career',
        description: 'Career - Web Application',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
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
    alias: [
      ...(mode === 'development'
        ? [
            {
              find: /^@ponti-studios\/auth\/(.+)$/,
              replacement: `${authSource}/$1`,
            },
            { find: '@ponti-studios/auth', replacement: `${authSource}/index.ts` },
          ]
        : []),
      { find: '~', replacement: path.resolve(import.meta.dirname, './app') },
    ],
    dedupe: ['react', 'react-dom'],
    tsconfigPaths: true,
  },
  server: {
    port: 4451,
    strictPort: true,
  },
}))

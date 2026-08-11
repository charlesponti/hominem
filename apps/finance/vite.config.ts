import path from 'node:path';

import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import type { ConfigEnv, PluginOption, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const authSource = path.resolve(import.meta.dirname, '../../packages/auth/src');

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';

  return {
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
          name: 'Finance',
          short_name: 'Finance',
          description: 'Personal finance tracker',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
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

      // Add bundle analyzer when ANALYZE flag is set
      isAnalyze &&
        visualizer({
          open: true,
          filename: 'build/client/stats.html',
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean) satisfies PluginOption[],

    // CSS optimization options
    css: {
      // Enable CSS modules
      modules: {
        localsConvention: 'camelCaseOnly' as const,
      },
      // Optimize in production
      devSourcemap: !isProd,
    },

    server: {
      allowedHosts: ['localhost'],
      port: 4444,
      strictPort: true,
    },

    build: {
      cssCodeSplit: true,
      minify: isProd ? 'esbuild' : false,
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
      },
      rollupOptions: {
        external: ['node:perf_hooks', 'perf_hooks'],
      },
      sourcemap: !isProd,
    },

    ssr: {
      noExternal: [/^@hominem\//, '@tanstack/react-query', 'better-auth'],
      external: ['node:fs', 'node:path', 'node:url', 'node:http'],
      resolve: {
        conditions: ['node'],
      },
    },
    resolve: {
      alias:
        mode === 'development'
          ? [
              {
                find: /^@ponti-studios\/auth\/(.+)$/,
                replacement: `${authSource}/$1`,
              },
              { find: '@ponti-studios/auth', replacement: `${authSource}/index.ts` },
            ]
          : [],
      dedupe: ['react', 'react-dom', '@tanstack/react-query'],
      tsconfigPaths: true,
    },
    optimizeDeps: {
      force: isDev,
      exclude: ['@react-router/node'],
    },
  };
});

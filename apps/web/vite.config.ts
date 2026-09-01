import path from 'node:path';

import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import type { ConfigEnv, PluginOption, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const isProd = mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';
  const shouldGenerateSourceMaps = process.env.SOURCEMAP === 'true' || isAnalyze;

  return {
    plugins: [
      tailwindcss(),
      reactRouter(),
      VitePWA({
        // we manage public/manifest.json ourselves and link it in root.tsx,
        // so let this plugin handle just the service worker
        manifest: false,
        outDir: 'build/client',
        registerType: 'autoUpdate',
        injectRegister: false,
        devOptions: {
          // content-hashed service workers don't play nice with Vite's dev
          // optimizer, which reissues module URLs with new hashes every
          // rebundle — a worker intercepting script requests in dev would
          // serve stale optimizer output and hide Vite's reload signal. So
          // only register in production, where the build is fixed and
          // content-hashed.
          enabled: false,
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
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
      isAnalyze &&
        visualizer({
          open: true,
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean) as PluginOption[],

    css: {
      modules: {
        localsConvention: 'camelCaseOnly' as const,
      },
      // sourcemaps only outside prod, no need to ship them in the build
      devSourcemap: !isProd,
    },

    // pre-bundle radix primitives used by lazily-loaded components so the
    // optimizer doesn't discover them mid-session — that causes
    // duplicate-React invalid-hook crashes until you hard reload
    optimizeDeps: {
      force: mode === 'development',
      include: [
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-slot',
        'shiki',
      ],
    },

    server: {
      port: 4445,
      strictPort: true,
    },

    resolve: {
      alias: {
        '~': path.resolve(import.meta.dirname, './app'),
      },
      dedupe: ['react', 'react-dom'],
      tsconfigPaths: true,
    },

    build: {
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      minify: isProd ? 'oxc' : false,
      rollupOptions: {
        external: ['node:perf_hooks', 'perf_hooks'],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/')) {
              // react and react-dom split apart to each stay under the chunk size limit
              if (id.includes('/react-dom/')) {
                return 'vendor-react-dom';
              }
              if (id.includes('/react/') && !id.includes('/react-dom/')) {
                return 'vendor-react';
              }
              if (id.includes('/react-router/')) {
                return 'vendor-router';
              }
              if (id.includes('/ai/') || id.includes('/ai-sdk/')) {
                return 'vendor-ai';
              }
              if (id.includes('/@radix-ui/')) {
                return 'vendor-radix';
              }
              // icons tend to be large, keep them in their own chunk
              if (id.includes('/lucide-react/')) {
                return 'vendor-icons';
              }
              if (id.includes('/react-syntax-highlighter/')) {
                return 'vendor-syntax-highlighter';
              }
              if (
                id.includes('/react-markdown/') ||
                id.includes('/remark-') ||
                id.includes('/rehype-')
              ) {
                return 'vendor-markdown';
              }
              if (id.includes('/@uppy/')) {
                return 'vendor-uppy';
              }
              if (id.includes('/gsap/')) {
                return 'vendor-gsap';
              }
              return undefined;
            }
            return undefined;
          },
        },
      },
      sourcemap: shouldGenerateSourceMaps,
    },
  };
});

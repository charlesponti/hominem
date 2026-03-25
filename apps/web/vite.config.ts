import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import type { ConfigEnv, PluginOption, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';
import { WEB_BRAND } from './app/lib/brand';

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const isProd = mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';
  const shouldGenerateSourceMaps = process.env.SOURCEMAP === 'true' || isAnalyze;

  return {
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: WEB_BRAND.manifest.name,
          short_name: WEB_BRAND.manifest.shortName,
          description: WEB_BRAND.manifest.description,
          theme_color: '#000000',
          background_color: '#ffffff',
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
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean) as PluginOption[],

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
      port: 4445,
      strictPort: true,
    },

    build: {
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200, // Allow route chunks up to 1.2MB
      minify: isProd ? 'esbuild' : false,
      rollupOptions: {
        external: ['node:perf_hooks', 'perf_hooks'],
        output: {
          manualChunks(id) {
            // Split vendor dependencies into separate chunks
            if (id.includes('node_modules/')) {
              // React core - split react and react-dom separately to stay under limit
              if (id.includes('/react-dom/')) {
                return 'vendor-react-dom';
              }
              if (id.includes('/react/') && !id.includes('/react-dom/')) {
                return 'vendor-react';
              }
              // React Router
              if (id.includes('/react-router/')) {
                return 'vendor-router';
              }
              // AI/ML libraries
              if (id.includes('/ai/') || id.includes('/ai-sdk/')) {
                return 'vendor-ai';
              }
              // Radix UI components
              if (id.includes('/@radix-ui/')) {
                return 'vendor-radix';
              }
              // Lucide icons (often large)
              if (id.includes('/lucide-react/')) {
                return 'vendor-icons';
              }
              return undefined;
            }
            return undefined;
          },
        },
      },
      sourcemap: shouldGenerateSourceMaps,
    },

    ssr: {
      noExternal: [/^@hominem\//],
    },
  };
});

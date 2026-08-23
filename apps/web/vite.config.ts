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
        // The app maintains its own public/manifest.json and links it
        // directly in root.tsx — let the plugin manage only the service
        // worker, not the manifest.
        manifest: false,
        outDir: 'build/client',
        registerType: 'autoUpdate',
        injectRegister: false,
        devOptions: {
          // Precached-hash service workers and Vite's dev-mode dependency
          // optimizer (which reissues module URLs with new version hashes
          // whenever it re-bundles) are fundamentally incompatible — a
          // worker intercepting `script` requests in dev serves stale
          // optimizer output and masks Vite's own reload signal. Only ever
          // register in production, where workbox precaches a fixed,
          // content-hashed build.
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

    // Pre-bundle radix primitives used by lazily-loaded components so the
    // optimizer never discovers them mid-session (causes duplicate-React
    // invalid-hook crashes until a hard reload).
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
      chunkSizeWarningLimit: 1200, // Allow route chunks up to 1.2MB
      minify: isProd ? 'oxc' : false,
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
              // Syntax highlighter (heavy with languages)
              if (id.includes('/react-syntax-highlighter/')) {
                return 'vendor-syntax-highlighter';
              }
              // Markdown renderer
              if (
                id.includes('/react-markdown/') ||
                id.includes('/remark-') ||
                id.includes('/rehype-')
              ) {
                return 'vendor-markdown';
              }
              // Uppy file upload
              if (id.includes('/@uppy/')) {
                return 'vendor-uppy';
              }
              // GSAP animations
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

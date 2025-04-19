import { svelte } from '@sveltejs/vite-plugin-svelte'
import * as path from 'node:path'
import analyze from 'rollup-plugin-analyzer'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, type PluginOption } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    tsconfigPaths(),
    VitePWA({
      manifest: {
        name: 'Carmen',
        short_name: 'carmen',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
        ],
      },
      registerType: 'autoUpdate',
    }),
    ...(process.env.ANALYZE === 'true'
      ? [
          visualizer({
            filename: 'build-analysis.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          }) as PluginOption,
          analyze({
            summaryOnly: true,
            limit: 20,
          }) as PluginOption,
        ]
      : []),
  ],
  build: {
    minify: 'esbuild',
    outDir: 'build',
    rollupOptions: {},
  },
  preview: {
    port: 53422,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 53422,
    watch: {
      ignored: ['**/node_modules', '**/.git', '**/.yarn', '**/.pnp.*', '**/*.test.tsx'],
    },
  },
})

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  build: {
    sourcemap: false,
    rollupOptions: {
      // Ensure server-only dependencies (e.g., postgres) stay out of the client bundle
      external: ['node:perf_hooks', 'perf_hooks'],
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
  optimizeDeps: {
    exclude: ['postgres'],
  },
  ssr: {
    external: ['postgres'],
  },
  server: {
    port: 4445,
    strictPort: true,
  },
})

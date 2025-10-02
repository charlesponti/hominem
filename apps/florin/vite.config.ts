import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    port: 4444,
    strictPort: true,
  },
  ssr: {
    external: ['node:fs', 'node:path', 'node:url', 'node:http'],
    resolve: {
      conditions: ['node'],
    },
  },
  optimizeDeps: {
    exclude: ['@react-router/node'],
  },
  build: {
    rollupOptions: {
      external: ['@react-router/node', '@trpc/react-query', '@trpc/client', '@trpc/server'],
    },
  },
})

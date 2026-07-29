import path from 'node:path'

import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
    },
  },
  clearScreen: false,
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, './app'),
    },
    dedupe: ['react', 'react-dom'],
    tsconfigPaths: true,
  },
  optimizeDeps: {
    // @ponti-studios/auth's client/provider and client/email-otp-route subpaths both
    // pull in the same createContext(null) singleton. Pre-bundling optimizes
    // each subpath as a separate esbuild/rolldown entry, which inlines its own
    // copy of that module — two AuthContext identities, so useAuthClient()
    // throws "must be used within AuthProvider" even though it is. Excluding
    // the package keeps it served as source, so every import shares one copy.
    exclude: ['@ponti-studios/auth'],
  },
  server: {
    port: 4451,
    strictPort: true,
  },
})

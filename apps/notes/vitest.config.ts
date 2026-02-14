import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tsconfigPaths(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    devOptions: {
      enabled: false,
    },
  })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/build/**', '**/dist/**'],
  },
})

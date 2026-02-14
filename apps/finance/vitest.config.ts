import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [tsConfigPaths(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    devOptions: {
      enabled: false,
    },
  })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.{ts,tsx,js,jsx}'],
    exclude: ['**/node_modules/**', '**/build/**', 'tests/**'],
  },
})

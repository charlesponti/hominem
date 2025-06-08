import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['vitest.setup.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      clean: true,
      enabled: true,
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
      reporter: ['lcov'],
      reportsDirectory: 'coverage',
    },
  },
})

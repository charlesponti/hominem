import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // @ts-expect-error
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './app/test/test.setup.tsx',
    clearMocks: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**'],
    coverage: {
      provider: 'v8',
      clean: true,
      enabled: true,
      exclude: [
        'build/**',
        'app/services/constants',
        'app/styles',
        'app/testUtils',
        'app/index.tsx',
        'app/**/*.spec.{ts,tsx}',
        'app/**/*.test.{ts,tsx}',
        'test/**',
        '*.config.{js,cjs}',
      ],
      reporter: ['lcov'],
      reportsDirectory: 'coverage',
    },
  },
})

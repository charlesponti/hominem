import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const testDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5434/app-test'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    env: {
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: 'test',
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('vitest.setup.ts', import.meta.url))],
    include: ['**/*.test.{ts,tsx,js,jsx}'],

    clearMocks: true,
    coverage: {
      provider: 'v8',
      clean: true,
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
      reporter: ['lcov'],
      reportsDirectory: 'coverage',
    },
  },
})

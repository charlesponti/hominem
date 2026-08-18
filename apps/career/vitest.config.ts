import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { TEST_DATABASE_URL } from '@hominem/db/test/database-url'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      VITE_PUBLIC_API_URL: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('vitest.setup.ts', import.meta.url))],
    include: ['**/*.test.{ts,tsx,js,jsx}'],
    fileParallelism: false,

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

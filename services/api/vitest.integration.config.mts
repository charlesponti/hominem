import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: '@hominem/api-integration',
    deps: {
      interopDefault: true,
    },
    globals: true,
    environment: 'node',
    setupFiles: './test/test.setup.integration.ts',
    clearMocks: true,
    slowTestThreshold: 1_000,
    include: [
      'src/auth/session-store.test.ts',
      'src/routes/auth.step-up.test.ts',
      'src/routes/finance/plaid/finance.plaid.router.test.ts',
      'src/routes/status.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/build/**'],
  },
})
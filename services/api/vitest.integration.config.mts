import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    deps: {
      interopDefault: true,
    },
    globals: true,
    environment: 'node',
    setupFiles: './test/test.setup.ts',
    clearMocks: true,
    include: [
      'src/auth/session-store.test.ts',
      'src/routes/auth.step-up.test.ts',
      'src/routes/finance/plaid/finance.plaid.router.test.ts',
      'src/routes/status.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/build/**'],
  },
})
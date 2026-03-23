import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: '@hominem/api-contract',
    deps: {
      interopDefault: true,
    },
    globals: true,
    environment: 'node',
    setupFiles: './test/test.setup.contract.ts',
    clearMocks: true,
    slowTestThreshold: 1_500,
    include: [
      'src/routes/auth.email-otp.contract.test.ts',
      'src/routes/auth.test-otp-route.test.ts',
      'src/routes/auth.e2e-login.test.ts',
      'src/routes/auth.rate-limit.test.ts',
      'src/routes/auth.device-contract.test.ts',
      'src/routes/auth.token-contract.test.ts',
      'src/middleware/block-probes.test.ts',
      'test/components.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/build/**'],
  },
})
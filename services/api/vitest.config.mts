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
    setupFiles: './test/test.setup.unit.ts',
    clearMocks: true,
    slowTestThreshold: 250,
    include: [
      'src/auth/test-otp-store.test.ts',
      'src/middleware/auth.test.ts',
      'src/middleware/request-logger.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/build/**'],
  },
})

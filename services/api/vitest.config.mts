import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: '@hominem/api-unit',
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
      'src/rpc/routes/chats.test.ts',
      'src/rpc/routes/files.test.ts',
      'src/rpc/routes/notes.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/build/**'],
  },
})

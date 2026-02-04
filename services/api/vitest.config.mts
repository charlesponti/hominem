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
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/build/**'],
  },
})

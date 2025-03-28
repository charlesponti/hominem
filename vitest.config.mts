import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    mockReset: true,
  },
  resolve: {
    alias: {
      '@ponti/utils': resolve(__dirname, './packages/utils/src'),
      '@ponti/ai': resolve(__dirname, './packages/ai/src'),
      '@cli': resolve(__dirname, './apps/cli/src'),
      '@api': resolve(__dirname, './apps/api/src'),
      '@web': resolve(__dirname, './apps/web'),
    },
  },
})

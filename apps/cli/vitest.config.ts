import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    testTimeout: 10000,
    mockReset: true,
  },
  // resolve: {
  //   alias: {
  //     '@': resolve(__dirname, './src'),
  //     '@/db': resolve(__dirname, '../../packages/utils/src/db'),
  //     '@/logger': resolve(__dirname, '../../packages/utils/src/logger'),
  //     '@/finance': resolve(__dirname, '../../packages/utils/src/finance'),
  //     '@/schema': resolve(__dirname, '../../packages/utils/src/db/schema'),
  //     '@ponti/utils': resolve(__dirname, '../../packages/utils/src'),
  //     '@ponti/ai': resolve(__dirname, '../../packages/ai/src'),
  //   },
  // },
})

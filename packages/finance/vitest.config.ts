import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/modern-finance*.test.ts', 'src/modern-finance.*.test.ts'],
  },
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/finance*.test.ts', 'src/finance.*.test.ts'],
  },
})

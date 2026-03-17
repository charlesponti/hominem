import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    alias: {
      '~/lib/posthog': new URL('./tests/__mocks__/posthog.ts', import.meta.url).pathname,
    },
  },
})

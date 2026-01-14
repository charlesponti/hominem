import { defineConfig } from 'vitest/config'
import projects from './vitest.workspace'

export default defineConfig({
  test: {
    // Use the workspace project list so Vitest runs all packages in a single process
    projects,

    // Increase maximum project configs Vitest will load in the extension (default 5)
    maximumConfigs: 20,

    // Coverage must be configured on the root when using `projects` (per Vitest docs)
    coverage: {
      provider: 'v8',
      clean: true,
      enabled: true,
      reporter: ['lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        '**/node_modules/**',
        '**/build/**',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
      ],
    },
  },
})

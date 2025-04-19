import { svelte } from '@sveltejs/vite-plugin-svelte';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST }), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/test.setup.tsx',
    clearMocks: true,
    include: ['./src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      clean: true,
      enabled: true,
      exclude: [
        'build/**',
        'src/services/constants',
        'src/styles',
        'src/testUtils',
        'src/main.ts',
        'src/**/*.spec.{ts,tsx}',
        'test/**',
        '*.config.{js,cjs,ts}',
      ],
      reporter: ['lcov'],
      reportsDirectory: 'coverage',
    },
  },
});
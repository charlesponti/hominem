import { defineConfig } from '@ark/attest';

export default defineConfig({
  // TypeScript configuration
  tsconfig: './tsconfig.attest.json',

  // Test file patterns
  testFilePatterns: ['**/*.type-perf.test.ts'],

  // Enable benchmarking and type performance tracking
  benchmarking: {
    enable: true,
  },

  // Update behavior
  updateSnapshots: process.argv.includes('--update-snapshots'),
});

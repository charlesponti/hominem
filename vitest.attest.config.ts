import { setup } from '@ark/attest';
import { defineConfig } from 'vitest/config';

// Initialize @ark/attest for type performance testing
setup();

export default defineConfig({
  test: {
    include: ['**/*.type-perf.test.ts'],
    globals: true,
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    include: ['src/finance*.test.ts', 'src/finance.*.test.ts', 'src/import/**/*.test.ts'],
    // Integration suites import @hominem/db at load time; fail loudly if the
    // pool cannot be created rather than hanging on empty file matches.
    fileParallelism: false,
  },
});

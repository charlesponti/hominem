import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from '@hominem/db/test/database-url';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
    },
    include: ['src/finance*.test.ts', 'src/finance.*.test.ts', 'src/import/**/*.test.ts'],
    // these tests import @hominem/db at load time, so run them one at a time or a
    // bad pool connection just hangs instead of failing clearly
    fileParallelism: false,
  },
});

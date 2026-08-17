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
  },
});

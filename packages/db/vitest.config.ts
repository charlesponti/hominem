import 'dotenv/config';
import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from './src/test/database-url.ts';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
    },
  },
});

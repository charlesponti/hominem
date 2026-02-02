import { reactRouter } from '@react-router/dev/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
  optimizeDeps: {
    exclude: ['postgres'],
  },
  ssr: {
    external: [
      '@hominem/lists-services',
      '@hominem/places-services',
      '@hominem/services',
      '@hominem/services/travel',
      '@hominem/services/emails',
      '@hominem/services/queues',
      '@hominem/services/types',
      '@hominem/db/test/fixtures',
    ],
  },
  build: {
    rollupOptions: {
      external: [
        '@hominem/lists-services',
        '@hominem/places-services',
        '@hominem/services',
        '@hominem/services/travel',
        '@hominem/services/emails',
        '@hominem/services/queues',
        '@hominem/services/types',
        '@hominem/db/test/fixtures',
      ],
    },
  },
});

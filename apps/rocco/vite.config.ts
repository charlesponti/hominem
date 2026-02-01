import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
      'perf_hooks': path.resolve(__dirname, 'perf_hooks.js'),
    },
  },
  optimizeDeps: {
    exclude: ['postgres'],
  },
  ssr: {
    external: ['@hominem/lists-services', '@hominem/places-services', '@hominem/services', '@hominem/services/travel', '@hominem/services/emails', '@hominem/services/queues', '@hominem/services/types', '@hominem/db/test/fixtures'],
  },
  build: {
    rollupOptions: {
external: ['@hominem/lists-services', '@hominem/places-services', '@hominem/services', '@hominem/services/travel', '@hominem/services/emails', '@hominem/services/queues', '@hominem/services/types', '@hominem/db/test/fixtures'],
    },
  },
});

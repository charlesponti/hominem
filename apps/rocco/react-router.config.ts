import type { Config } from '@react-router/dev/config';

export default {
  // Enable server-side rendering
  ssr: true,
  build: {
    rollupOptions: {
      external: ['@hominem/hono-client'],
    },
  },
} satisfies Config;

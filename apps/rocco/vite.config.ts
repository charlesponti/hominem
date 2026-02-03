import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
  optimizeDeps: {
    exclude: ['postgres'],
  },
  ssr: {
    noExternal: [/^@hominem\//],
  },
  build: {
    rollupOptions: {},
  },
  server: {
    port: 4446,
    strictPort: true,
  },
});

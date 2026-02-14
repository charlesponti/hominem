import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './app/test/test.setup.tsx',
    clearMocks: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**'],
  },
});

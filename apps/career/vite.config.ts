import path from 'node:path'

import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const authSource = path.resolve(import.meta.dirname, '../../packages/auth/src')

export default defineConfig(({ mode }) => ({
  build: {
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
    },
  },
  clearScreen: false,
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: [
      ...(mode === 'development'
        ? [
            {
              find: /^@ponti-studios\/auth\/(.+)$/,
              replacement: `${authSource}/$1`,
            },
            { find: '@ponti-studios/auth', replacement: `${authSource}/index.ts` },
          ]
        : []),
      { find: '~', replacement: path.resolve(import.meta.dirname, './app') },
    ],
    dedupe: ['react', 'react-dom'],
    tsconfigPaths: true,
  },
  server: {
    port: 4451,
    strictPort: true,
  },
}))

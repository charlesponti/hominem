import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    outDir: 'build',
    target: 'node18',
    ssr: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /node_modules/,
        'node:fs',
        'node:path',
        'node:os',
        'node:crypto',
        'node:https',
        'node:http',
        'node:url',
        'node:zlib',
        'node:stream',
        'node:buffer',
        'node:util',
        'node:process',
        'node:events'
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
})
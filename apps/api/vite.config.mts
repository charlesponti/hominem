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
        /^node:.*/,
        /^@hominem\/(?!.*\.(ts|tsx)$).*$/,
        /node_modules/
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['@hominem/ai', '@hominem/utils'],
    exclude: ['fsevents']
  },
  resolve: {
    conditions: ['import', 'default', 'node'],
    mainFields: ['module', 'main']
  }
})
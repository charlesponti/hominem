import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/server-index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', '@hominem/data'],
  tsconfig: 'tsconfig.json',
})

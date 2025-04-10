import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/**/*.ts'],
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,  // Skip type checking for now
  outDir: 'dist',
  shims: true,
  skipNodeModulesBundle: true,
  target: 'node18',
  ignoreWatch: ['node_modules', 'dist'],
  onSuccess: 'echo Build completed successfully!'
})
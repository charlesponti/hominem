import { build } from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'

await build({
  entryPoints: ['src/index.ts', 'src/db/index.ts', 'src/db/schema/index.ts', 'src/types.ts'],
  outdir: 'dist',
  bundle: false,
  platform: 'node',
  format: 'esm',
  target: ['node20'],
  plugins: [nodeExternalsPlugin()],
  sourcemap: true,
  outExtension: { '.js': '.js' },
  tsconfig: './tsconfig.json',
})

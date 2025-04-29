import { build } from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { copy } from 'esbuild-plugin-copy'

await build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node20'],
  external: ['@colors/colors', 'logform', 'utils'],
  plugins: [
    nodeExternalsPlugin({
      // Do not externalize workspace packages to ensure proper bundling
      allowList: ['@hominem/utils', '@hominem/ai'],
    }),
    copy({
      // Copy necessary non-JS files
      assets: [
        {
          from: ['./src/**/*.json'],
          to: ['./dist'],
        },
      ],
    }),
  ],
  sourcemap: true,
  outExtension: { '.js': '.js' },
  tsconfig: './tsconfig.json',
})

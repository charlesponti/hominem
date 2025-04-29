import { build } from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { copy } from 'esbuild-plugin-copy'

await build({
  entryPoints: ['src/index.ts'],
  outdir: 'build',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node20'],
  external: ['@colors/colors', 'logform', 'utils', '@modelcontextprotocol/sdk', 'node:*'],
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
          to: ['./build'], // Fix the output directory from ./dist to ./build
        },
      ],
    }),
  ],
  sourcemap: true,
  outExtension: { '.js': '.js' },
  tsconfig: './tsconfig.json',
  // Add banner to inject ESM import for Node.js built-ins
  banner: {
    js: `import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);`,
  },
})

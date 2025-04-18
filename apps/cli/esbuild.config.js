import esbuild from 'esbuild'

async function build() {
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'build/index.js',
    minify: true,
    external: ['duckdb', 'sqlite3', 'playwright-core', 'chromium-bidi', 'electron'],
    packages: 'external', // ensures all node_modules are externalized
  })
}

async function dev() {
  const context = await esbuild
    .context({
      entryPoints: ['src/index.ts'],
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      outfile: 'build/index.js',
      minify: true,
      external: ['duckdb', 'sqlite3', 'playwright-core', 'chromium-bidi', 'electron'],
      packages: 'external',
    })
    .catch(() => process.exit(1))

  await context.watch()
  console.log('Watching for changes...')
}

dev()

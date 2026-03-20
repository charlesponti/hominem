import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const rootTsconfigPath = path.join(rootDir, 'tsconfig.json')
const rootTsconfig = await Bun.file(rootTsconfigPath).json()

if (!Array.isArray(rootTsconfig.references)) {
  throw new Error('Root tsconfig.json does not define project references')
}

const referencedConfigs = rootTsconfig.references
  .map((reference) => {
    if (!reference || typeof reference.path !== 'string') {
      return null
    }

    return reference.path.endsWith('.json')
      ? path.resolve(rootDir, reference.path)
      : path.resolve(rootDir, reference.path, 'tsconfig.json')
  })
  .filter((configPath) => configPath !== null)

const failedConfigs = []

for (const configPath of referencedConfigs) {
  console.log(`\n[native-typecheck] ${path.relative(rootDir, configPath)}`)

  const result = Bun.spawnSync({
    cmd: ['bun', 'x', 'tsgo', '-p', configPath, '--noEmit'],
    cwd: rootDir,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    failedConfigs.push(path.relative(rootDir, configPath))
  }
}

if (failedConfigs.length > 0) {
  console.error('\nNative TypeScript checks failed for:')
  for (const configPath of failedConfigs) {
    console.error(`- ${configPath}`)
  }
  process.exit(1)
}

console.log('\nNative TypeScript checks passed')
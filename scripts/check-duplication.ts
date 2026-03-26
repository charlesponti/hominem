import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const SOURCE_ROOTS = ['apps', 'packages', 'services', 'tools', 'scripts', 'config']
const IGNORED_DIRS = new Set([
  '.git',
  '.turbo',
  '.react-router',
  'build',
  'coverage',
  'dist',
  'e2e',
  'node_modules',
  'public',
  'test-results',
  'tests',
  '__tests__',
])
const IGNORED_FILE_PATTERNS = [
  /\.(test|spec)\.[^.]+$/,
  /\.integration\.[^.]+$/,
  /\.mobile\.e2e\.[^.]+$/,
]
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function shouldIgnoreFile(filePath: string): boolean {
  return IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(filePath))
}

function collectSourceFiles(rootDir: string, collectedFiles: string[]): void {
  if (!fs.existsSync(rootDir)) {
    return
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue
    }

    const fullPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, collectedFiles)
      continue
    }

    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      continue
    }

    if (shouldIgnoreFile(fullPath)) {
      continue
    }

    collectedFiles.push(fullPath)
  }
}

const sourceFiles: string[] = []
for (const sourceRoot of SOURCE_ROOTS) {
  collectSourceFiles(path.resolve(sourceRoot), sourceFiles)
}

const result = spawnSync(
  'bunx',
  [
    'jscpd',
    '--format',
    'typescript,javascript',
    '--min-lines',
    '8',
    '--min-tokens',
    '30',
    '--reporters',
    'console',
    '--exitCode',
    '1',
    ...sourceFiles,
  ],
  {
    stdio: 'inherit',
  },
)

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
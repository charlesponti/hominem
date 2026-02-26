import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

type AuditErrorType = 'type_error' | 'recursion_limit' | 'oom'

interface TraceEvent {
  name?: string
  dur?: number
  args?: { path?: string; count?: number }
}

interface DiscoveredProject {
  name: string
  tsconfigPath: string
  projectRoot: string
}

interface CompilerInvocation {
  command: string
  argsPrefix: string[]
  label: string
}

export interface FileMetric {
  path: string
  checkMs: number
  instantiations: number
  suggestions: string[]
}

export interface ProjectAuditResult {
  name: string
  tsconfigPath: string
  ok: boolean
  durationSec: number
  errorType?: AuditErrorType
  files: FileMetric[]
  topSlowFiles: Array<{ path: string; ms: number; suggestions: string[] }>
  summary: {
    totalFiles: number
    slowFiles: number
    totalTypeCheckMs: number
    avgMsPerFile: number
    totalInstantiations: number
  }
}

export interface AuditSummary {
  generatedAt: string
  projectRoot: string
  thresholdSec: number
  compiler: string
  totalProjects: number
  totalSlowFiles: number
  hasCritical: boolean
  results: ProjectAuditResult[]
}

export interface RunTypeAuditOptions {
  projectRoot: string
  thresholdSec: number
  traceDir?: string
  jsonOut?: string
  compiler?: string
  maxProjects?: number
  memoryMb?: number
  cleanTraceDir?: boolean
}

const DEFAULT_EXCLUDED_DIRS = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.type-analysis',
  '.type-traces'
])

function slugifyProjectName(input: string): string {
  return input.replace(/[\\/]/g, '-').replace(/^-+|-+$/g, '') || 'root'
}

export function discoverTypeScriptProjects(projectRoot: string, maxDepth = 6): DiscoveredProject[] {
  const root = resolve(projectRoot)
  const projects: DiscoveredProject[] = []

  function scan(currentDir: string, depth: number) {
    if (depth > maxDepth) {
      return
    }

    const tsconfigPath = join(currentDir, 'tsconfig.json')
    if (existsSync(tsconfigPath)) {
      const rel = relative(root, currentDir)
      projects.push({
        name: rel.length === 0 ? '.' : rel,
        tsconfigPath,
        projectRoot: currentDir
      })
    }

    const entries = readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }
      if (DEFAULT_EXCLUDED_DIRS.has(entry.name)) {
        continue
      }
      if (entry.name.startsWith('.')) {
        continue
      }
      scan(join(currentDir, entry.name), depth + 1)
    }
  }

  scan(root, 0)

  return projects.sort((a, b) => a.name.localeCompare(b.name))
}

function resolveCompilerInvocation(projectRoot: string, preferred?: string): CompilerInvocation {
  if (preferred && preferred.trim().length > 0) {
    return {
      command: preferred,
      argsPrefix: [],
      label: preferred
    }
  }

  let cursor = resolve(projectRoot)
  const compilerName = process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
  while (true) {
    const localScript = join(cursor, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(localScript)) {
      return {
        command: 'node',
        argsPrefix: [localScript],
        label: `node ${localScript}`
      }
    }
    const localCompiler = join(cursor, 'node_modules', '.bin', compilerName)
    if (existsSync(localCompiler)) {
      return {
        command: localCompiler,
        argsPrefix: [],
        label: localCompiler
      }
    }
    const parent = dirname(cursor)
    if (parent === cursor) {
      break
    }
    cursor = parent
  }

  return {
    command: 'tsc',
    argsPrefix: [],
    label: 'tsc'
  }
}

function parseTraceEvents(traceFile: string): TraceEvent[] {
  if (!existsSync(traceFile)) {
    return []
  }

  let raw = readFileSync(traceFile, 'utf-8').trim()
  if (raw.length === 0) {
    return []
  }
  if (!raw.endsWith(']')) {
    raw = raw.replace(/,\s*$/, '') + ']'
  }
  return JSON.parse(raw) as TraceEvent[]
}

function normalizeMetricPath(projectRoot: string, filePath: string): string {
  const rel = relative(projectRoot, filePath)
  if (rel.startsWith('..')) {
    return filePath
  }
  return `./${rel}`
}

function getSuggestionsForFile(checkMs: number, instantiations: number): string[] {
  const suggestions: string[] = []
  if (checkMs > 1000) {
    suggestions.push(`type-check >1s (${(checkMs / 1000).toFixed(2)}s)`)
  }
  if (instantiations > 5000) {
    suggestions.push(`high instantiations (${instantiations})`)
  }
  if (instantiations > 10000) {
    suggestions.push(`critical instantiations (${instantiations})`)
  }
  return suggestions
}

export function collectFileMetrics(projectRoot: string, events: TraceEvent[]): FileMetric[] {
  const fileTimes = new Map<string, { checkMs: number; instantiations: number }>()
  for (const ev of events) {
    const path = ev.args?.path
    if (!path) {
      continue
    }
    const existing = fileTimes.get(path) ?? { checkMs: 0, instantiations: 0 }
    if (ev.name?.includes('check') && ev.dur) {
      existing.checkMs += ev.dur / 1000
    }
    if (ev.args?.count) {
      existing.instantiations += ev.args.count
    }
    fileTimes.set(path, existing)
  }

  return Array.from(fileTimes.entries()).map(([path, metric]) => ({
    path: normalizeMetricPath(projectRoot, path),
    checkMs: metric.checkMs,
    instantiations: metric.instantiations,
    suggestions: getSuggestionsForFile(metric.checkMs, metric.instantiations)
  }))
}

function detectErrorType(output: string): AuditErrorType {
  if (/TS2589|excessively deep/.test(output)) {
    return 'recursion_limit'
  }
  if (/heap out of memory|exit status 134/.test(output)) {
    return 'oom'
  }
  return 'type_error'
}

function runProjectAudit(
  project: DiscoveredProject,
  compiler: CompilerInvocation,
  traceRoot: string,
  thresholdSec: number,
  memoryMb: number
): ProjectAuditResult {
  const traceDir = join(traceRoot, slugifyProjectName(project.name))
  mkdirSync(traceDir, { recursive: true })

  const args = [
    ...compiler.argsPrefix,
    '-p',
    project.tsconfigPath,
    '--noEmit',
    '--generateTrace',
    traceDir,
    '--skipLibCheck'
  ]

  const start = Date.now()
  let output = ''
  let ok = true
  let errorType: AuditErrorType | undefined
  try {
    execSync(buildCommand(compiler.command, args), {
      cwd: project.projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=${memoryMb}`
      }
    })
  } catch (error: unknown) {
    ok = false
    output = extractCommandOutput(error)
    errorType = detectErrorType(output)
  }
  const durationSec = (Date.now() - start) / 1000

  const traceFile = join(traceDir, 'trace.json')
  const events = parseTraceEvents(traceFile)
  const files = collectFileMetrics(project.projectRoot, events)

  let totalTypeCheckMs = 0
  let totalInstantiations = 0
  for (const file of files) {
    totalTypeCheckMs += file.checkMs
    totalInstantiations += file.instantiations
  }

  const slowFiles = files.filter((file) => file.checkMs > thresholdSec * 1000)
  const topSlowFiles = slowFiles
    .sort((a, b) => b.checkMs - a.checkMs)
    .slice(0, 10)
    .map((file) => ({
      path: file.path,
      ms: file.checkMs,
      suggestions: file.suggestions
    }))

  return {
    name: project.name,
    tsconfigPath: project.tsconfigPath,
    ok,
    durationSec,
    errorType,
    files,
    topSlowFiles,
    summary: {
      totalFiles: files.length,
      slowFiles: slowFiles.length,
      totalTypeCheckMs,
      avgMsPerFile: files.length > 0 ? totalTypeCheckMs / files.length : 0,
      totalInstantiations
    }
  }
}

export function runTypeAudit(options: RunTypeAuditOptions): AuditSummary {
  const projectRoot = resolve(options.projectRoot)
  const thresholdSec = options.thresholdSec
  const compiler = resolveCompilerInvocation(projectRoot, options.compiler)
  const traceDir = resolve(options.traceDir ?? join(projectRoot, '.type-analysis'))
  const memoryMb = options.memoryMb ?? 4096
  try {
    execSync(buildCommand(compiler.command, [...compiler.argsPrefix, '--version']), { stdio: 'pipe' })
  } catch {
    throw new Error(`TypeScript compiler is not executable: ${compiler.label}`)
  }

  if (options.cleanTraceDir ?? true) {
    rmSync(traceDir, { force: true, recursive: true })
  }
  mkdirSync(traceDir, { recursive: true })

  let projects = discoverTypeScriptProjects(projectRoot)
  if (typeof options.maxProjects === 'number') {
    projects = projects.slice(0, options.maxProjects)
  }

  if (projects.length === 0) {
    throw new Error(`No tsconfig.json files found under ${projectRoot}`)
  }

  const results: ProjectAuditResult[] = []
  for (const project of projects) {
    results.push(runProjectAudit(project, compiler, traceDir, thresholdSec, memoryMb))
  }

  const totalSlowFiles = results.reduce((sum, result) => sum + result.summary.slowFiles, 0)
  const hasCritical = results.some((result) => result.errorType === 'oom' || result.errorType === 'recursion_limit')

  const summary: AuditSummary = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    thresholdSec,
    compiler: compiler.label,
    totalProjects: results.length,
    totalSlowFiles,
    hasCritical,
    results
  }

  if (options.jsonOut) {
    const out = resolve(options.jsonOut)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, JSON.stringify(summary, null, 2))
  }

  return summary
}

function extractCommandOutput(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return ''
  }
  const stdout = 'stdout' in error ? String(error.stdout ?? '') : ''
  const stderr = 'stderr' in error ? String(error.stderr ?? '') : ''
  return `${stdout}${stderr}`
}

function quote(value: string): string {
  if (value.length === 0) {
    return "''"
  }
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function buildCommand(command: string, args: string[]): string {
  return [quote(command), ...args.map((arg) => quote(arg))].join(' ')
}

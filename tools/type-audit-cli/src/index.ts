#!/usr/bin/env node

import { runTypeAudit } from './core.js'
import { runTsserver } from './tsserver.js'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface CliOptions {
  projectRoot: string
  thresholdSec: number
  traceDir?: string
  jsonOut?: string
  compiler?: string
  maxProjects?: number
  memoryMb?: number
}

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))

function parseArgs(argv: string[]): CliOptions {
  let projectRoot = process.cwd()
  let thresholdSec = 1
  let traceDir: string | undefined
  let jsonOut: string | undefined
  let compiler: string | undefined
  let maxProjects: number | undefined
  let memoryMb: number | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]

    if (token === '--project' && next) {
      projectRoot = next
      index += 1
      continue
    }
    if (token === '--threshold' && next) {
      thresholdSec = Number.parseFloat(next)
      index += 1
      continue
    }
    if (token === '--trace-dir' && next) {
      traceDir = next
      index += 1
      continue
    }
    if (token === '--json' && next) {
      jsonOut = next
      index += 1
      continue
    }
    if (token === '--compiler' && next) {
      compiler = next
      index += 1
      continue
    }
    if (token === '--max-projects' && next) {
      maxProjects = Number.parseInt(next, 10)
      index += 1
      continue
    }
    if (token === '--memory-mb' && next) {
      memoryMb = Number.parseInt(next, 10)
      index += 1
      continue
    }
    if (token === '--help' || token === '-h') {
      printUsage()
      process.exit(0)
    }
  }

  return {
    projectRoot,
    thresholdSec,
    traceDir,
    jsonOut,
    compiler,
    maxProjects,
    memoryMb
  }
}

function printUsage() {
  process.stdout.write('Usage: type-audit [audit] [--project <path>] [--threshold <seconds>] [--json <file>]\n')
  process.stdout.write('                         [--trace-dir <path>] [--compiler <binary>] [--max-projects <n>]\n')
  process.stdout.write('                         [--memory-mb <n>]\n')
  process.stdout.write('\n')
  process.stdout.write('Other subcommands:\n')
  process.stdout.write('  tsserver | compare | dashboard\n')
}

function statusIcon(ok: boolean, errorType?: string): string {
  if (ok) {
    return 'OK '
  }
  if (errorType === 'recursion_limit') {
    return 'REC'
  }
  if (errorType === 'oom') {
    return 'OOM'
  }
  return 'ERR'
}

function printSummary(summary: ReturnType<typeof runTypeAudit>) {
  process.stdout.write('\nTYPE INFERENCE AUDIT REPORT\n')
  process.stdout.write('===========================\n')
  process.stdout.write(`projects: ${summary.totalProjects} | slow files: ${summary.totalSlowFiles} | compiler: ${summary.compiler}\n\n`)
  process.stdout.write('STS | TIME(s) | FILES | SLOW | AVG(s) | INST(k) | PROJECT\n')
  process.stdout.write('----|---------|-------|------|--------|---------|--------\n')

  for (const result of summary.results) {
    process.stdout.write(
      `${statusIcon(result.ok, result.errorType)} | ${result.durationSec.toFixed(2).padStart(7)} | ${String(result.summary.totalFiles).padStart(5)} | ${String(result.summary.slowFiles).padStart(4)} | ${(result.summary.avgMsPerFile / 1000).toFixed(3).padStart(6)} | ${String(Math.round(result.summary.totalInstantiations / 1000)).padStart(7)} | ${result.name}\n`
    )
  }

  const slowFiles = summary.results.flatMap((result) => result.topSlowFiles.map((file) => ({
    project: result.name,
    file
  })))
  if (slowFiles.length > 0) {
    process.stdout.write('\nSLOW FILES\n')
    process.stdout.write('----------\n')
    for (const entry of slowFiles) {
      process.stdout.write(`${entry.project} | ${(entry.file.ms / 1000).toFixed(2)}s | ${entry.file.path}\n`)
    }
  }
}

function resolveExitCode(summary: ReturnType<typeof runTypeAudit>): number {
  if (summary.hasCritical) {
    return 2
  }
  if (summary.totalSlowFiles > 0) {
    return 1
  }
  return 0
}

function main() {
  try {
    const argv = process.argv.slice(2)
    const first = argv[0]
    if (first === 'tsserver') {
      process.exitCode = runTsserver(argv.slice(1))
      return
    }
    if (first === 'compare') {
      process.exitCode = runLegacy('legacy-compare-type-performance.js', argv.slice(1))
      return
    }
    if (first === 'dashboard') {
      process.exitCode = runLegacy('legacy-generate-dashboard.js', argv.slice(1))
      return
    }

    const options = parseArgs(first === 'audit' ? argv.slice(1) : argv)
    const summary = runTypeAudit(options)
    printSummary(summary)
    if (options.jsonOut) {
      process.stdout.write(`\njson report: ${options.jsonOut}\n`)
    }
    process.exitCode = resolveExitCode(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown failure'
    process.stderr.write(`type-audit failed: ${message}\n`)
    process.exitCode = 10
  }
}

function runLegacy(scriptName: string, args: string[]): number {
  const scriptPath = join(MODULE_DIR, scriptName)
  const run = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit'
  })
  if (run.error) {
    throw run.error
  }
  return run.status ?? 10
}

main()

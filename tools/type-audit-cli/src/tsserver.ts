import { existsSync, readFileSync, writeFileSync } from 'node:fs'

interface TSServerMetrics {
  autocompleteLatency: number
  diagnosticsLatency: number
  memoryUsage: number
  fileCount: number
  symbolCount: number
  moduleResolutionCount: number
  slowOperations: Array<{ operation: string; duration: number; file?: string }>
}

function parseTSServerLog(logPath: string): TSServerMetrics {
  if (!existsSync(logPath)) {
    throw new Error(`TSServer log not found: ${logPath}`)
  }

  const content = readFileSync(logPath, 'utf-8')
  const lines = content.split('\n')

  let autocompleteLatency = 0
  let diagnosticsLatency = 0
  let memoryUsage = 0
  let fileCount = 0
  let symbolCount = 0
  let moduleResolutionCount = 0
  const slowOperations: Array<{ operation: string; duration: number; file?: string }> = []

  for (const line of lines) {
    const completionMatch = line.match(/completionEntryDetails\(\d+\):\s*(\d+)ms/)
    if (completionMatch) {
      const duration = Number.parseInt(completionMatch[1], 10)
      autocompleteLatency = Math.max(autocompleteLatency, duration)
    }

    const autoMatch = line.match(/completionInfo\(\d+\):\s*(\d+)ms/)
    if (autoMatch) {
      const duration = Number.parseInt(autoMatch[1], 10)
      if (duration > 500) {
        slowOperations.push({ operation: 'completionInfo', duration })
      }
    }

    const diagMatch = line.match(/geterr\(\d+\):\s*(\d+)ms/)
    if (diagMatch) {
      diagnosticsLatency = Math.max(diagnosticsLatency, Number.parseInt(diagMatch[1], 10))
    }

    const memMatch = line.match(/memory used: (\d+)K/)
    if (memMatch) {
      memoryUsage = Math.max(memoryUsage, Number.parseInt(memMatch[1], 10) / 1024)
    }

    const filesMatch = line.match(/Files:\s+(\d+)/)
    if (filesMatch) {
      fileCount = Math.max(fileCount, Number.parseInt(filesMatch[1], 10))
    }

    const symbolsMatch = line.match(/Symbols:\s+(\d+)/)
    if (symbolsMatch) {
      symbolCount = Math.max(symbolCount, Number.parseInt(symbolsMatch[1], 10))
    }

    if (line.includes('======== Resolving module')) {
      moduleResolutionCount += 1
    }

    const resolveMatch = line.match(/Resolving module.*took (\d+)ms/)
    if (resolveMatch) {
      const duration = Number.parseInt(resolveMatch[1], 10)
      if (duration > 100) {
        const moduleMatch = line.match(/module '([^']+)'/)
        slowOperations.push({
          operation: 'moduleResolution',
          duration,
          file: moduleMatch?.[1]
        })
      }
    }
  }

  return {
    autocompleteLatency,
    diagnosticsLatency,
    memoryUsage,
    fileCount,
    symbolCount,
    moduleResolutionCount,
    slowOperations: slowOperations.sort((a, b) => b.duration - a.duration).slice(0, 20)
  }
}

function getLatencyStatus(latency: number): string {
  if (latency < 100) return 'GOOD'
  if (latency < 500) return 'SLOW'
  return 'CRITICAL'
}

function getTSServerRecommendations(metrics: TSServerMetrics): string[] {
  const issues: string[] = []

  if (metrics.autocompleteLatency > 500) {
    issues.push('Autocomplete >500ms: check barrel imports and very large type unions.')
  }
  if (metrics.diagnosticsLatency > 1000) {
    issues.push('Diagnostics >1s: reduce cross-file type dependencies, add explicit return types.')
  }
  if (metrics.memoryUsage > 2048) {
    issues.push('Memory >2GB: split project or use TS project references more aggressively.')
  }
  if (metrics.fileCount > 1000) {
    issues.push('Files >1000: consider excluding tests/generated files from tsconfig.')
  }
  if (metrics.slowOperations.some((op) => op.operation === 'moduleResolution' && op.duration > 500)) {
    issues.push('Slow module resolution: review tsconfig paths and deep import chains.')
  }

  return issues
}

export function runTsserver(args: string[]): number {
  let logfile: string | undefined
  let jsonOut: string | undefined

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--logfile' && args[i + 1]) logfile = args[i + 1]
    if (args[i] === '--json' && args[i + 1]) jsonOut = args[i + 1]
  }

  if (!logfile) {
    process.stdout.write('Usage: type-audit tsserver --logfile <path> [--json out.json]\n\n')
    process.stdout.write('To generate tsserver logs:\n')
    process.stdout.write('  1. In VS Code set "typescript.tsserver.log": "verbose"\n')
    process.stdout.write('  2. Restart TS server\n')
    process.stdout.write('  3. Capture a log file path\n')
    return 1
  }

  const metrics = parseTSServerLog(logfile)
  process.stdout.write('TSSERVER PERFORMANCE\n')
  process.stdout.write('===================\n')
  process.stdout.write(`autocomplete: ${metrics.autocompleteLatency}ms (${getLatencyStatus(metrics.autocompleteLatency)})\n`)
  process.stdout.write(`diagnostics: ${metrics.diagnosticsLatency}ms (${getLatencyStatus(metrics.diagnosticsLatency)})\n`)
  process.stdout.write(`memory: ${metrics.memoryUsage.toFixed(0)}MB\n`)
  process.stdout.write(`files: ${metrics.fileCount}\n`)
  process.stdout.write(`symbols: ${metrics.symbolCount}\n`)
  process.stdout.write(`module resolutions: ${metrics.moduleResolutionCount}\n`)

  if (metrics.slowOperations.length > 0) {
    process.stdout.write('\nslow operations:\n')
    for (const op of metrics.slowOperations.slice(0, 10)) {
      process.stdout.write(`  - ${op.operation} ${op.duration}ms${op.file ? ` (${op.file})` : ''}\n`)
    }
  }

  const recommendations = getTSServerRecommendations(metrics)
  if (recommendations.length > 0) {
    process.stdout.write('\nrecommendations:\n')
    for (const rec of recommendations) {
      process.stdout.write(`  - ${rec}\n`)
    }
  }

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(metrics, null, 2))
    process.stdout.write(`\njson report: ${jsonOut}\n`)
  }

  return 0
}

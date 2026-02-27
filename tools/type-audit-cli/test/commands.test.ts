import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'bun:test'

const CLI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLI_DIST_ENTRY = path.join(CLI_ROOT, 'dist', 'index.js')

function runCli(args: string[], cwd = CLI_ROOT) {
  return spawnSync('node', [CLI_DIST_ENTRY, ...args], {
    cwd,
    encoding: 'utf-8'
  })
}

describe('type-audit command integration', () => {
  it('compare returns regression exit code when baseline worsens', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'type-audit-compare-'))
    const baselinePath = path.join(tempRoot, 'baseline.json')
    const currentPath = path.join(tempRoot, 'current.json')

    const baseline = {
      generatedAt: new Date().toISOString(),
      thresholdSec: 1,
      results: [
        {
          name: 'pkg/a',
          durationSec: 1,
          summary: { totalFiles: 1, slowFiles: 0, totalInstantiations: 10, typeHubFiles: 0 }
        }
      ]
    }
    const current = {
      generatedAt: new Date().toISOString(),
      thresholdSec: 1,
      results: [
        {
          name: 'pkg/a',
          durationSec: 1.4,
          summary: { totalFiles: 1, slowFiles: 1, totalInstantiations: 10, typeHubFiles: 0 }
        }
      ]
    }

    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2))
    fs.writeFileSync(currentPath, JSON.stringify(current, null, 2))

    const run = runCli(['compare', '--baseline', baselinePath, '--current', currentPath])
    expect(run.status).toBe(1)
    expect(run.stdout).toContain('Performance regressions detected')
  })

  it('dashboard generates html output from audit json', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'type-audit-dashboard-'))
    const inputPath = path.join(tempRoot, 'audit.json')
    const outputPath = path.join(tempRoot, 'dashboard.html')

    const report = {
      generatedAt: new Date().toISOString(),
      results: [
        {
          name: 'pkg/a',
          durationSec: 1.2,
          summary: {
            totalFiles: 2,
            slowFiles: 1,
            totalInstantiations: 123,
            typeHubFiles: 0
          },
          files: [
            { path: './src/a.ts', checkMs: 1200, instantiations: 123, suggestions: [] }
          ]
        }
      ]
    }
    fs.writeFileSync(inputPath, JSON.stringify(report, null, 2))

    const run = runCli(['dashboard', '--input', inputPath, '--output', outputPath])
    expect(run.status).toBe(0)
    expect(fs.existsSync(outputPath)).toBeTrue()

    const html = fs.readFileSync(outputPath, 'utf-8')
    expect(html).toContain('Type Performance Dashboard')
    expect(html).toContain('pkg/a')
  })

  it('tsserver shows usage without logfile', () => {
    const run = runCli(['tsserver'])
    expect(run.status).toBe(1)
    expect(run.stdout).toContain('Usage: type-audit tsserver --logfile <path>')
  })
})

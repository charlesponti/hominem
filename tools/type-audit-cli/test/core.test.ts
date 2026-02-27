import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'bun:test'

import { collectFileMetrics, discoverTypeScriptProjects } from '../src/core.js'

describe('type audit core', () => {
  it('discovers tsconfig projects outside node_modules', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'type-audit-discovery-'))

    fs.mkdirSync(path.join(root, 'apps', 'web'), { recursive: true })
    fs.mkdirSync(path.join(root, 'packages', 'utils'), { recursive: true })
    fs.mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true })

    fs.writeFileSync(path.join(root, 'tsconfig.json'), '{}')
    fs.writeFileSync(path.join(root, 'apps', 'web', 'tsconfig.json'), '{}')
    fs.writeFileSync(path.join(root, 'packages', 'utils', 'tsconfig.json'), '{}')
    fs.writeFileSync(path.join(root, 'node_modules', 'pkg', 'tsconfig.json'), '{}')

    const projects = discoverTypeScriptProjects(root)
    const names = projects.map((project) => project.name)

    expect(names).toEqual(['.', 'apps/web', 'packages/utils'])
  })

  it('aggregates trace metrics by file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'type-audit-metrics-'))
    const fileA = path.join(root, 'src', 'a.ts')
    const fileB = path.join(root, 'src', 'b.ts')

    const metrics = collectFileMetrics(root, [
      { name: 'checkSourceFile', dur: 1000, args: { path: fileA, count: 200 } },
      { name: 'checkSourceFile', dur: 2000, args: { path: fileA, count: 300 } },
      { name: 'checkExpression', dur: 500, args: { path: fileB, count: 20 } }
    ])

    const byPath = new Map(metrics.map((metric) => [metric.path, metric]))
    const aMetric = byPath.get('./src/a.ts')
    const bMetric = byPath.get('./src/b.ts')

    expect(aMetric).toBeDefined()
    expect(aMetric?.checkMs).toBe(3)
    expect(aMetric?.instantiations).toBe(500)

    expect(bMetric).toBeDefined()
    expect(bMetric?.checkMs).toBe(0.5)
    expect(bMetric?.instantiations).toBe(20)
  })
})

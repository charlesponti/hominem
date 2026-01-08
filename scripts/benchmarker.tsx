#!/usr/bin/env node

/**
 * scripts/benchmarker.tsx
 * Exportable micro-benchmark utility for measuring function execution time.
 * Use programmatically:
 *
 *   import { benchmarkAll, BenchmarkConfig } from './scripts/benchmarker'
 *   const results = await benchmarkAll([
 *     { name: 'fast', fn: () => computeFast() },
 *     { name: 'slow', fn: () => computeSlow() }
 *   ], { iterations: 100000, runs: 50 })
 *
 * The module intentionally contains no domain-specific logic (no URL checks).
 */

export type BenchmarkConfig<T = unknown> = {
  iterations?: number
  runs?: number
  inputs?: T[] // per-call inputs; will be passed to fn(input)
  delayMsBetweenRuns?: number
}

export type BenchResult<T = unknown> = {
  name: string
  runs: number[] // nanoseconds per run
  totalAvgNs: number
  perCallAvgNs: number
  stddevNs: number
  config: Required<BenchmarkConfig<T>>
}

const DEFAULT_CONFIG_BASE = {
  iterations: 100000,
  runs: 50,
  inputs: [] as unknown[],
  delayMsBetweenRuns: 0,
}

function makeConfig<T>(config?: BenchmarkConfig<T>): Required<BenchmarkConfig<T>> {
  return { ...DEFAULT_CONFIG_BASE, ...(config || {}) } as Required<BenchmarkConfig<T>>
}

function hrtimeNs(): bigint {
  return process.hrtime.bigint()
}

function mean(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stddev(arr: number[], arrMean = mean(arr)) {
  const variance = arr.reduce((acc, v) => acc + (v - arrMean) ** 2, 0) / arr.length
  return Math.sqrt(variance)
}

function runSingleIteration<T, F>(fn: (input?: T) => F, inputs: T[], iterations: number): number {
  const start = hrtimeNs()
  for (let i = 0; i < iterations; i++) {
    if (inputs.length === 0) {
      void fn()
    } else {
      for (const input of inputs) {
        void fn(input)
      }
    }
  }
  const end = hrtimeNs()
  return Number(end - start) // nanoseconds
}

export async function benchmarkFunction<T, F>(
  name: string,
  fn: (input?: T) => F,
  config?: BenchmarkConfig<T>
): Promise<BenchResult<T>> {
  const cfg = makeConfig(config)
  const results: number[] = []

  for (let r = 0; r < cfg.runs; r++) {
    const ns = runSingleIteration(fn, cfg.inputs, cfg.iterations)
    results.push(ns)
    if (cfg.delayMsBetweenRuns) {
      await new Promise((res) => setTimeout(res, cfg.delayMsBetweenRuns))
    }
  }

  const totalAvgNs = mean(results)
  const perCallAvgNs =
    cfg.inputs.length === 0
      ? totalAvgNs / cfg.iterations
      : totalAvgNs / (cfg.iterations * cfg.inputs.length)
  const std = stddev(results, totalAvgNs)

  return {
    name,
    runs: results,
    totalAvgNs,
    perCallAvgNs,
    stddevNs: std,
    config: cfg,
  }
}

export async function benchmarkAll<T, F>(
  tests: Array<{ name: string; fn: (input?: T) => F }>,
  config?: BenchmarkConfig<T>
): Promise<BenchResult<T>[]> {
  const results: BenchResult<T>[] = []
  for (const t of tests) {
    const res = await benchmarkFunction(t.name, t.fn, config)
    results.push(res)
  }
  return results
}

export function formatBenchResults<T>(results: BenchResult<T>[]) {
  return results.map((r) => ({
    name: r.name,
    runs: r.runs.length,
    totalAvgNs: Math.round(r.totalAvgNs),
    perCallAvgNs: Number(r.perCallAvgNs.toFixed(2)),
    stddevNs: Number(r.stddevNs.toFixed(2)),
    config: r.config,
  }))
}

// Minimal CLI for convenience: print usage if executed directly
if (require.main === module) {
  console.log('This module exports benchmarking utilities. Use programmatically:')
  console.log("  import { benchmarkAll } from './scripts/benchmarker'")
  console.log('See file header comments for usage examples')
}

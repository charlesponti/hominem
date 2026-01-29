#!/usr/bin/env bun

/**
 * Type Inference Auditing CLI
 *
 * Purpose: Identify and suggest fixes for type inference that exceeds 1 second
 * per file in this monorepo. Generates per-package traces, parses
 * them, and produces actionable recommendations.
 *
 * Usage:
 *   bun scripts/type-inference-audit.ts [--json report.json] [--threshold 1.0]
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const TRACE_DIR = join(ROOT, '.type-inference-audit-traces');

interface FileTraceEvent {
  dur?: number;
  name?: string;
  args?: { path?: string; count?: number };
}

interface PkgResult {
  name: string;
  ok: boolean;
  durationSec: number;
  errorType?: 'type_error' | 'recursion_limit' | 'oom';
  files: FileMetric[];
  topSlowFiles: Array<{ path: string; ms: number; suggestions: string[] }>;
  summary: {
    totalFiles: number;
    slowFiles: number;
    totalTypeCheckMs: number;
    avgMsPerFile: number;
  };
}

interface FileMetric {
  path: string;
  checkMs: number;
  instantiations: number;
  suggestions: string[];
}

function normalizePath(p: string): string {
  return p.replace(ROOT, '.');
}

function getSuggestionsForFile(filePath: string, checkMs: number, instantiations: number): string[] {
  const suggestions: string[] = [];
  const content = (() => {
    try {
      return readFileSync(join(ROOT, filePath), 'utf-8');
    } catch {
      return '';
    }
  })();

  if (checkMs > 1000) suggestions.push(`🔥 Type check >1s (${(checkMs / 1000).toFixed(2)}s). Consider splitting file or extracting large inline types.`);

  if (instantiations > 5000) suggestions.push(`🔁 High instantiations (${instantiations}). Reduce generic nesting, avoid complex unions/intersections.`);
  if (instantiations > 10000) suggestions.push(`🚨 Critical instantiations (${instantiations}). Refactor to modules and use explicit return types.`);

  // Heuristic patterns to suggest
  const patterns = [
    { regex: /type\s+\w+\s*=\s*Pick<.*Omit<.*>>/, msg: 'Avoid deep Pick/Omit chains; extract intermediate types.' },
    { regex: /export\s+type\s+\w+\s*=\s*.*&.*&.*&/, msg: 'Flatten intersection types; use interfaces or named aliases.' },
    { regex: /\[\s*\w+\s+in\s+.*\|\|\w+\s*]/, msg: 'Large indexed access unions slow; use discriminated unions or enums.' },
    { regex: /(\w+\s*:\s*\(.*\)\s*=>\s*.*\s*=>\s*.*)/, msg: 'Nested generic functions may cause inference loops; annotate returns.' },
    { regex: /export\s*\*\s+from\s+['"]@\w+\/['"]\s*$/, msg: 'Re-export entire package creates heavy reference graphs; re-export specific symbols.' },
  ];

  for (const { regex, msg } of patterns) {
    if (regex.test(content)) suggestions.push(`💡 ${msg}`);
  }

  // Hominem-specific heuristics
  if (filePath.includes('schema') || filePath.includes('types')) {
    suggestions.push(`📦 Schema/type files should be minimal. Avoid deriving complex query types here.`);
  }
  if (filePath.includes('prisma') && (content.includes('@prisma/client') || content.includes('Prisma'))) {
    suggestions.push(`🐘 Prisma re-exports via schema/index can cause cyclic imports. Prefer direct @prisma/client imports in hot files.`);
  }

  return suggestions;
}

async function auditPackage(name: string, pkgPath: string, thresholdSec = 1.0): Promise<PkgResult> {
  const tsconfig = join(pkgPath, 'tsconfig.json');
  if (!existsSync(tsconfig)) return { name, ok: false, durationSec: 0, files: [], topSlowFiles: [], summary: { totalFiles: 0, slowFiles: 0, totalTypeCheckMs: 0, avgMsPerFile: 0 } };

  process.stdout.write(`Auditing ${name.padEnd(30)} ... `);

  const pkgTraceDir = join(TRACE_DIR, name.replace(/\//g, '-'));
  if (!existsSync(pkgTraceDir)) mkdirSync(pkgTraceDir, { recursive: true });

  const start = Date.now();
  let output = '';
  let exitOk = true;
  let errorType: PkgResult['errorType'];
  try {
    output = execSync(`bunx tsc -p ${tsconfig} --noEmit --generateTrace ${pkgTraceDir} --skipLibCheck`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    }).toString();
  } catch (e: any) {
    exitOk = false;
    output = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    if (/TS2589|excessively deep/.test(output)) errorType = 'recursion_limit';
    else if (/heap out of memory|exit status 134/.test(output)) errorType = 'oom';
    else errorType = 'type_error';
  }
  const duration = (Date.now() - start) / 1000;
  if (exitOk) {
    console.log(`✅ ${duration.toFixed(2)}s`);
  } else {
    const icon = errorType === 'recursion_limit' ? '🔥' : errorType === 'oom' ? '💥' : '⚠️';
    console.log(`${icon} ${duration.toFixed(2)}s (${errorType})`);
  }

  // Parse trace
  const traceFile = join(pkgTraceDir, 'trace.json');
  const filesMetrics: FileMetric[] = [];
  let totalTypeCheckMs = 0;
  if (existsSync(traceFile)) {
    let raw = readFileSync(traceFile, 'utf-8').trim();
    if (!raw.endsWith(']')) raw = raw.replace(/,\s*$/, '') + ']';
    const events: FileTraceEvent[] = JSON.parse(raw);

    const fileTimes = new Map<string, { checkMs: number; instantiations: number }>();
    for (const ev of events) {
      const path = ev.args?.path;
      if (!path) continue;
      const existing = fileTimes.get(path) ?? { checkMs: 0, instantiations: 0 };
      if (ev.name?.includes('check') && ev.dur) existing.checkMs += ev.dur / 1000;
      if (ev.args?.count) existing.instantiations += ev.args.count;
      fileTimes.set(path, existing);
    }

    for (const [path, metric] of fileTimes.entries()) {
      const suggestions = getSuggestionsForFile(path, metric.checkMs, metric.instantiations);
      filesMetrics.push({ path: normalizePath(path), checkMs: metric.checkMs, instantiations: metric.instantiations, suggestions });
      totalTypeCheckMs += metric.checkMs;
    }
  }

  const totalFiles = filesMetrics.length;
  const slowFiles = filesMetrics.filter((f) => f.checkMs > thresholdSec * 1000).length;
  const avgMsPerFile = totalFiles > 0 ? totalTypeCheckMs / totalFiles : 0;

  const topSlowFiles = filesMetrics
    .filter((f) => f.checkMs > thresholdSec * 1000)
    .sort((a, b) => b.checkMs - a.checkMs)
    .slice(0, 10)
    .map((f) => ({ path: f.path, ms: f.checkMs, suggestions: f.suggestions }));

  return {
    name,
    ok: exitOk,
    durationSec: duration,
    errorType,
    files: filesMetrics,
    topSlowFiles,
    summary: { totalFiles, slowFiles, totalTypeCheckMs, avgMsPerFile },
  };
}

async function main() {
  const args = process.argv.slice(2);
  let jsonOut: string | undefined;
  let thresholdSec = 1.0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && args[i + 1]) jsonOut = args[i + 1];
    if (args[i] === '--threshold' && args[i + 1]) thresholdSec = parseFloat(args[i + 1]);
  }

  console.log('🚀 Type Inference Audit — Target < 1s per file\n');

  if (existsSync(TRACE_DIR)) rmSync(TRACE_DIR, { recursive: true });
  mkdirSync(TRACE_DIR, { recursive: true });

  const apps = ['finance', 'notes', 'rocco'].map((d) => ({ name: `apps/${d}`, path: join('apps', d) }));
  const packages = ['db', 'services', 'finance', 'ui', 'utils', 'events', 'places'].map((d) => ({ name: `packages/${d}`, path: join('packages', d) }));
  const targets = [...apps, ...packages].filter((t) => existsSync(join(ROOT, t.path, 'tsconfig.json')));

  const results: PkgResult[] = [];
  for (const target of targets) {
    const res = await auditPackage(target.name, target.path, thresholdSec);
    results.push(res);
  }

  // Global report
  console.log('\n' + '='.repeat(80));
  console.log('TYPE INFERENCE AUDIT REPORT');
  console.log('='.repeat(80));

  // Table view
  const rows = results.map((r) => [
    r.ok ? '✅' : r.errorType === 'recursion_limit' ? '🔥' : r.errorType === 'oom' ? '💥' : '⚠️',
    `${r.durationSec.toFixed(2)}s`,
    `${r.summary.totalFiles}`,
    `${r.summary.slowFiles}`,
    `${(r.summary.avgMsPerFile / 1000).toFixed(3)}s`,
    r.name,
  ]);
  console.log(`\n${'STATUS'.padEnd(8)} | ${'TIME'.padEnd(7)} | ${'FILES'.padEnd(5)} | ${'SLOW'.padEnd(4)} | ${'AVG'.padEnd(6)} | PACKAGE`);
  console.log('-'.repeat(80));
  for (const row of rows) {
    console.log(row.join(' | '));
  }

  // Detailed slow files
  const allSlowFiles = results.flatMap((r) => r.topSlowFiles);
  if (allSlowFiles.length > 0) {
    console.log('\n🔥 SLOW FILES (by descending cost):\n');
    for (const f of allSlowFiles) {
      console.log(`${(f.ms / 1000).toFixed(2)}s | ${f.path}`);
      for (const s of f.suggestions) {
        console.log(`    • ${s}`);
      }
    }
  }

  // Summary
  const totalSlowFiles = results.reduce((sum, r) => sum + r.summary.slowFiles, 0);
  const anyCritical = results.some((r) => r.errorType === 'recursion_limit' || r.errorType === 'oom');
  if (anyCritical || totalSlowFiles > 0) {
    console.log('\n🚨 ACTIONS REQUIRED:');
    console.log('  • Prioritize files with 🔥 icons; they likely crash your IDE/TS server.');
    console.log('  • Reduce instantiations by avoiding generic infer on every property access.');
    console.log('  • Use explicit return types in functions that return derived types.');
    console.log('  • Split large files; keep each file under ~300 LOC for type checker.');
  } else {
    console.log('\n✅ All files under threshold! Type inference looks healthy.');
  }

  // JSON output
  if (jsonOut) {
    const report = {
      generatedAt: new Date().toISOString(),
      thresholdSec,
      results,
      summary: {
        totalPackages: results.length,
        okPackages: results.filter((r) => r.ok).length,
        packagesWithSlowFiles: results.filter((r) => r.summary.slowFiles > 0).length,
        criticalPackages: results.filter((r) => r.errorType === 'recursion_limit' || r.errorType === 'oom').length,
      },
    };
    writeFileSync(jsonOut, JSON.stringify(report, null, 2));
    console.log(`\n📁 JSON report written to ${jsonOut}`);
  }

  // Exit codes
  if (anyCritical) process.exit(2);
  else if (totalSlowFiles > 0) process.exit(1);
  else process.exit(0);
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
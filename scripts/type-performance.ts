#!/usr/bin/env bun

/**
 * Unified Type Performance Tools
 *
 * Combines functionality from:
 *  - scripts/find-slow-types.ts
 *  - scripts/analyze-type-performance.ts
 *  - scripts/type-inference-audit.ts
 *
 * Modes:
 *  - run-all: run tsc traces for all apps/packages and produce a summary
 *  - analyze <traceDir>: analyze an existing trace directory (trace.json)
 *  - audit: run a focused per-package inference audit with suggestions
 *
 * Examples:
 *  bun run scripts/type-performance.ts run-all --summary-json out.json
 *  bun run scripts/type-performance.ts analyze ./.type-traces/packages-db
 *  bun run scripts/type-performance.ts audit --json audit.json --threshold 1.0
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

// Shared helpers / types
interface Result {
  name: string;
  path: string;
  success: boolean;
  duration: number;
  error?: string;
}

function runTscWithTrace(tsconfigPath: string, outDir: string, memMb = 4096): void {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  execSync(`bunx tsc -p ${tsconfigPath} --noEmit --generateTrace ${outDir} --skipLibCheck`, {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${memMb}` },
  });
}

async function runCheck(name: string, path: string, traceBase: string): Promise<Result | null> {
  const tsconfigPath = join(ROOT, path, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) return null;

  process.stdout.write(`Checking ${name.padEnd(30)} ... `);

  const outputDir = join(traceBase, name.replace(/\//g, '-'));
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const start = Date.now();
  try {
    runTscWithTrace(tsconfigPath, outputDir, 8192);
    const duration = (Date.now() - start) / 1000;
    console.log(`✅ Success (${duration.toFixed(2)}s)`);
    return { name, path, success: true, duration };
  } catch (error: any) {
    const duration = (Date.now() - start) / 1000;
    const output = (error.stdout?.toString() || '') + (error.stderr?.toString() || '');

    if (output.includes('TS2589') || output.includes('excessively deep')) {
      console.log(`🔥 RECURSION LIMIT (${duration.toFixed(2)}s)`);
      return { name, path, success: false, duration, error: 'recursion_limit' };
    }

    if (output.includes('heap out of memory') || error.status === 134) {
      console.log(`💥 CRASH / OOM (${duration.toFixed(2)}s)`);
      return { name, path, success: false, duration, error: 'oom' };
    }

    console.log(`⚠️  ERRORS FOUND (${duration.toFixed(2)}s)`);
    return { name, path, success: false, duration, error: 'type_errors' };
  }
}

// analyzeTrace: adapted from analyze-type-performance.ts
interface TraceEvent {
  name?: string;
  dur?: number;
  args?: { path?: string; count?: number };
}

function analyzeTrace(tracePath: string, top = 20) {
  const traceFile = join(tracePath, 'trace.json');
  if (!existsSync(traceFile)) {
    console.error(`Trace file not found at ${traceFile}`);
    process.exit(1);
  }

  let traceContent = readFileSync(traceFile, 'utf-8').trim();
  if (!traceContent.endsWith(']')) {
    traceContent = traceContent.replace(/,\s*$/, '') + ']';
  }

  let trace: TraceEvent[];
  try {
    trace = JSON.parse(traceContent);
  } catch {
    console.error('❌ Failed to parse trace file.');
    process.exit(1);
  }

  const typeChecks = trace.filter((e) => e.name && e.name.includes('check') && e.dur);
  const slowestChecks = typeChecks.sort((a, b) => (b.dur || 0) - (a.dur || 0)).slice(0, top);

  console.log('⏱️  Top Slowest Type Checks:\n');
  console.log('Duration (ms) | Event');
  console.log('--------------|------');
  for (const c of slowestChecks) {
    const durationMs = ((c.dur || 0) / 1000).toFixed(2);
    console.log(`${durationMs.padStart(13)} | ${c.name}`);
  }

  const instantiations = new Map<string, number>();
  for (const ev of trace) {
    if (ev.args?.path && ev.args?.count) {
      const existing = instantiations.get(ev.args.path) || 0;
      instantiations.set(ev.args.path, existing + ev.args.count);
    }
  }

  if (instantiations.size > 0) {
    const sorted = Array.from(instantiations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, top);
    console.log('\n\n📈 Top Files by Type Instantiations:\n');
    console.log('Count     | File');
    console.log('----------|-----');
    for (const [path, count] of sorted) {
      const shortPath = path.replace(process.cwd(), '.');
      console.log(`${count.toString().padStart(9)} | ${shortPath}`);
    }
  }

  const totalDuration = trace.reduce((s, e) => s + (e.dur || 0), 0);
  const totalMs = (totalDuration / 1000).toFixed(2);
  console.log(`\n\n⏱️  Total Type Checking Time: ${totalMs}ms`);
  console.log(`📝 Total Events: ${trace.length}`);
}

// auditPackage: adapted from type-inference-audit.ts with suggestions
interface FileMetric {
  path: string;
  checkMs: number;
  instantiations: number;
  suggestions: string[];
}

interface DetailedFileMetric extends FileMetric {
  loc: number;
  imports: number;
  exports: number;
  complexity: number;
  problematicSnippets: Array<{ line: number; code: string; issue: string }>;
  dependencies: string[];
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

interface DetailedPkgResult extends Omit<PkgResult, 'files'> {
  files: DetailedFileMetric[];
}

function normalizePath(p: string): string {
  return p.replace(ROOT, '.');
}

function getSuggestionsForFile(
  filePath: string,
  checkMs: number,
  instantiations: number,
): string[] {
  const suggestions: string[] = [];
  let content = '';
  try {
    content = readFileSync(join(ROOT, filePath), 'utf-8');
  } catch {}

  if (checkMs > 1000)
    suggestions.push(
      `🔥 Type check >1s (${(checkMs / 1000).toFixed(2)}s). Consider splitting file or extracting large inline types.`,
    );
  if (instantiations > 5000)
    suggestions.push(
      `🔁 High instantiations (${instantiations}). Reduce generic nesting, avoid complex unions/intersections.`,
    );
  if (instantiations > 10000)
    suggestions.push(
      `🚨 Critical instantiations (${instantiations}). Refactor to modules and use explicit return types.`,
    );

  const patterns: Array<{ regex: RegExp; msg: string }> = [
    {
      regex: /type\s+\w+\s*=\s*Pick<.*Omit<.*>>/,
      msg: 'Avoid deep Pick/Omit chains; extract intermediate types.',
    },
    {
      regex: /export\s+type\s+\w+\s*=\s*.*&.*&.*&/,
      msg: 'Flatten intersection types; use interfaces or named aliases.',
    },
    {
      regex: /\[\s*\w+\s+in\s+.*\|\|\w+\s*]/,
      msg: 'Large indexed access unions slow; use discriminated unions or enums.',
    },
    {
      regex: /(\w+\s*:\s*\(.*\)\s*=>\s*.*\s*=>\s*.*)/,
      msg: 'Nested generic functions may cause inference loops; annotate returns.',
    },
    {
      regex: /export\s*\*\s+from\s+['"]@\w+\//,
      msg: 'Re-export entire package creates heavy reference graphs; re-export specific symbols.',
    },
  ];

  for (const { regex, msg } of patterns) {
    if (regex.test(content)) suggestions.push(`💡 ${msg}`);
  }

  if (filePath.includes('schema') || filePath.includes('types'))
    suggestions.push(
      '📦 Schema/type files should be minimal. Avoid deriving complex query types here.',
    );
  if (
    filePath.includes('prisma') &&
    (content.includes('@prisma/client') || content.includes('Prisma'))
  )
    suggestions.push(
      '🐘 Prisma re-exports via schema/index can cause cyclic imports. Prefer direct @prisma/client imports in hot files.',
    );

  return suggestions;
}

function analyzeFileDetails(
  filePath: string,
  checkMs: number,
  instantiations: number,
): DetailedFileMetric {
  const fullPath = join(ROOT, filePath);
  let content = '';
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch {}

  const lines = content.split('\n');
  const loc = lines.length;

  const importMatches = content.match(/import\s+.*from\s+['"]/g) || [];
  const imports = importMatches.length;

  const exportMatches = content.match(/export\s+(const|function|class|type|interface)/g) || [];
  const exports = exportMatches.length;

  // Simple complexity metric: count of type-related keywords
  const complexity = (content.match(/\b(type|interface|class|function|const|let|var)\b/g) || [])
    .length;

  const dependencies: string[] = [];
  const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    dependencies.push(match[1]);
  }

  const problematicSnippets: Array<{ line: number; code: string; issue: string }> = [];
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('Pick<') && line.includes('Omit<')) {
      problematicSnippets.push({ line: lineNum, code: line.trim(), issue: 'Deep Pick/Omit chain' });
    }
    if (line.includes('&') && line.includes('&') && line.includes('&')) {
      problematicSnippets.push({
        line: lineNum,
        code: line.trim(),
        issue: 'Complex intersection type',
      });
    }
    if (line.includes('[') && line.includes('in') && line.includes(']')) {
      problematicSnippets.push({ line: lineNum, code: line.trim(), issue: 'Indexed access union' });
    }
  });

  const suggestions = getSuggestionsForFile(filePath, checkMs, instantiations);

  return {
    path: normalizePath(filePath),
    checkMs,
    instantiations,
    suggestions,
    loc,
    imports,
    exports,
    complexity,
    problematicSnippets,
    dependencies,
  };
}

async function auditPackage(
  name: string,
  pkgPath: string,
  traceBase: string,
  thresholdSec = 1.0,
): Promise<PkgResult> {
  const tsconfig = join(pkgPath, 'tsconfig.json');
  if (!existsSync(tsconfig))
    return {
      name,
      ok: false,
      durationSec: 0,
      files: [],
      topSlowFiles: [],
      summary: { totalFiles: 0, slowFiles: 0, totalTypeCheckMs: 0, avgMsPerFile: 0 },
    };

  process.stdout.write(`Auditing ${name.padEnd(30)} ... `);
  const pkgTraceDir = join(traceBase, name.replace(/\//g, '-'));
  if (!existsSync(pkgTraceDir)) mkdirSync(pkgTraceDir, { recursive: true });

  const start = Date.now();
  let output = '';
  let exitOk = true;
  let errorType: PkgResult['errorType'];
  try {
    execSync(`bunx tsc -p ${tsconfig} --noEmit --generateTrace ${pkgTraceDir} --skipLibCheck`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    });
  } catch (e: any) {
    exitOk = false;
    output = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    if (/TS2589|excessively deep/.test(output)) errorType = 'recursion_limit';
    else if (/heap out of memory|exit status 134/.test(output)) errorType = 'oom';
    else errorType = 'type_error';
  }
  const duration = (Date.now() - start) / 1000;
  if (exitOk) console.log(`✅ ${duration.toFixed(2)}s`);
  else
    console.log(
      `${errorType === 'recursion_limit' ? '🔥' : errorType === 'oom' ? '💥' : '⚠️'} ${duration.toFixed(2)}s (${errorType})`,
    );

  const traceFile = join(pkgTraceDir, 'trace.json');
  const filesMetrics: FileMetric[] = [];
  let totalTypeCheckMs = 0;
  if (existsSync(traceFile)) {
    let raw = readFileSync(traceFile, 'utf-8').trim();
    if (!raw.endsWith(']')) raw = raw.replace(/,\s*$/, '') + ']';
    const events: TraceEvent[] = JSON.parse(raw);

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
      filesMetrics.push({
        path: normalizePath(path),
        checkMs: metric.checkMs,
        instantiations: metric.instantiations,
        suggestions,
      });
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

async function diagnosePackage(
  name: string,
  pkgPath: string,
  traceBase: string,
  thresholdSec = 1.0,
): Promise<DetailedPkgResult> {
  const baseResult = await auditPackage(name, pkgPath, traceBase, thresholdSec);
  const projectFiles = baseResult.files.filter(
    (f) => !f.path.includes('node_modules') && f.path.startsWith('./'),
  );

  const allDetailedFiles = baseResult.files.map((f) => {
    const isProjectFile = projectFiles.some((pf) => pf.path === f.path);
    if (isProjectFile) {
      return analyzeFileDetails(f.path, f.checkMs, f.instantiations);
    } else {
      return {
        ...f,
        loc: 0,
        imports: 0,
        exports: 0,
        complexity: 0,
        problematicSnippets: [],
        dependencies: [],
      };
    }
  });

  return {
    ...baseResult,
    files: allDetailedFiles,
  };
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';

  if (cmd === 'run-all') {
    const TRACE_DIR = join(ROOT, '.type-traces');
    if (existsSync(TRACE_DIR)) rmSync(TRACE_DIR, { recursive: true });
    mkdirSync(TRACE_DIR, { recursive: true });

    const apps = readdirSync(join(ROOT, 'apps')).map((d) => ({
      name: `apps/${d}`,
      path: join('apps', d),
    }));
    const packages = readdirSync(join(ROOT, 'packages')).map((d) => ({
      name: `packages/${d}`,
      path: join('packages', d),
    }));
    const targets = [...apps, ...packages].filter((t) =>
      existsSync(join(ROOT, t.path, 'tsconfig.json')),
    );

    const results: Result[] = [];
    for (const t of targets) {
      const r = await runCheck(t.name, t.path, TRACE_DIR);
      if (r) results.push(r);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('TYPE PERFORMANCE SUMMARY');
    console.log('='.repeat(70));
    const sorted = results.slice().sort((a, b) => b.duration - a.duration);
    console.log(`\n${'STATUS'.padEnd(15)} | ${'TIME'.padEnd(8)} | ${'PROJECT'}`);
    console.log('-'.repeat(70));
    for (const res of sorted) {
      let status = '✅ OK';
      if (res.error === 'recursion_limit') status = '🔥 RECURSION';
      else if (res.error === 'oom') status = '💥 OOM';
      else if (res.error === 'type_errors') status = '⚠️ ERRORS';
      console.log(`${status.padEnd(15)} | ${res.duration.toFixed(2)}s | ${res.name}`);
    }

    const summaryOutIdx = args.indexOf('--summary-json');
    const out =
      summaryOutIdx !== -1 && args[summaryOutIdx + 1]
        ? args[summaryOutIdx + 1]
        : join(TRACE_DIR, 'summary.json');
    const summary = results.map((r) => ({
      name: r.name,
      path: r.path,
      success: r.success,
      durationSec: r.duration,
      error: r.error || null,
      traceDir: join(TRACE_DIR, r.name.replace(/\//g, '-')),
    }));
    writeFileSync(
      out,
      JSON.stringify({ results: summary, generatedAt: new Date().toISOString() }, null, 2),
    );
    console.log(`\n📁 Summary written to ${out}`);
    const critical = results.filter((r) => r.error === 'recursion_limit' || r.error === 'oom');
    if (critical.length > 0) process.exitCode = 2;
    return;
  }

  if (cmd === 'analyze') {
    const traceArg = args[1] || '.';
    analyzeTrace(traceArg);
    return;
  }

  if (cmd === 'audit') {
    const TRACE_DIR = join(ROOT, '.type-inference-audit-traces');
    if (existsSync(TRACE_DIR)) rmSync(TRACE_DIR, { recursive: true });
    mkdirSync(TRACE_DIR, { recursive: true });

    let jsonOut: string | undefined;
    let threshold = 1.0;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json' && args[i + 1]) jsonOut = args[i + 1];
      if (args[i] === '--threshold' && args[i + 1]) threshold = parseFloat(args[i + 1]);
    }

    const apps = readdirSync(join(ROOT, 'apps')).map((d) => ({
      name: `apps/${d}`,
      path: join('apps', d),
    }));
    const packages = readdirSync(join(ROOT, 'packages')).map((d) => ({
      name: `packages/${d}`,
      path: join('packages', d),
    }));
    const targets = [...apps, ...packages].filter((t) =>
      existsSync(join(ROOT, t.path, 'tsconfig.json')),
    );

    const results: PkgResult[] = [];
    for (const t of targets) {
      const res = await auditPackage(t.name, t.path, TRACE_DIR, threshold);
      results.push(res);
    }

    // Print compact table
    console.log('\n' + '='.repeat(80));
    console.log('TYPE INFERENCE AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(
      `\n${'STATUS'.padEnd(8)} | ${'TIME'.padEnd(7)} | ${'FILES'.padEnd(5)} | ${'SLOW'.padEnd(4)} | ${'AVG'.padEnd(6)} | PACKAGE`,
    );
    console.log('-'.repeat(80));
    for (const r of results) {
      const status = r.ok
        ? '✅'
        : r.errorType === 'recursion_limit'
          ? '🔥'
          : r.errorType === 'oom'
            ? '💥'
            : '⚠️';
      console.log(
        `${status.padEnd(8)} | ${r.durationSec.toFixed(2).padEnd(7)} | ${String(r.summary.totalFiles).padEnd(5)} | ${String(r.summary.slowFiles).padEnd(4)} | ${(r.summary.avgMsPerFile / 1000).toFixed(3).padEnd(6)} | ${r.name}`,
      );
    }

    const allSlowFiles = results.flatMap((r) => r.topSlowFiles);
    if (allSlowFiles.length > 0) {
      console.log('\n🔥 SLOW FILES (by descending cost):\n');
      for (const f of allSlowFiles) {
        console.log(`${(f.ms / 1000).toFixed(2)}s | ${f.path}`);
        for (const s of f.suggestions) console.log(`    • ${s}`);
      }
    }

    const totalSlowFiles = results.reduce((sum, r) => sum + r.summary.slowFiles, 0);
    const anyCritical = results.some(
      (r) => r.errorType === 'recursion_limit' || r.errorType === 'oom',
    );
    if (anyCritical || totalSlowFiles > 0) {
      console.log('\n🚨 ACTIONS REQUIRED:');
      console.log('  • Prioritize files with 🔥 icons; they likely crash your IDE/TS server.');
      console.log('  • Reduce instantiations by avoiding generic infer on every property access.');
      console.log('  • Use explicit return types in functions that return derived types.');
      console.log('  • Split large files; keep each file under ~300 LOC for type checker.');
    } else {
      console.log('\n✅ All files under threshold! Type inference looks healthy.');
    }

    if (jsonOut) {
      writeFileSync(
        jsonOut,
        JSON.stringify({ generatedAt: new Date().toISOString(), threshold, results }, null, 2),
      );
      console.log(`\n📁 JSON report written to ${jsonOut}`);
    }

    if (anyCritical) process.exit(2);
    else if (totalSlowFiles > 0) process.exit(1);
    return;
  }

  if (cmd === 'diagnose') {
    const TRACE_DIR = join(ROOT, '.type-diagnosis-traces');
    if (existsSync(TRACE_DIR)) rmSync(TRACE_DIR, { recursive: true });
    mkdirSync(TRACE_DIR, { recursive: true });

    let jsonOut: string | undefined;
    let threshold = 1.0;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json' && args[i + 1]) jsonOut = args[i + 1];
      if (args[i] === '--threshold' && args[i + 1]) threshold = parseFloat(args[i + 1]);
    }

    // Temporarily limit to just packages/utils for testing
    const targets = [{ name: 'packages/utils', path: join('packages', 'utils') }];

    const results: DetailedPkgResult[] = [];
    for (const t of targets) {
      const res = await diagnosePackage(t.name, t.path, TRACE_DIR, threshold);
      results.push(res);
    }

    console.log('\n🔍 DETAILED TYPE PERFORMANCE DIAGNOSIS REPORT');
    console.log('='.repeat(80));
    console.log('This report contains detailed metrics for agent analysis and fix implementation.');
    console.log(`Generated at: ${new Date().toISOString()}`);
    console.log(`Threshold: ${threshold}s`);
    console.log('='.repeat(80));

    const allFiles = results.flatMap((r) => r.files);
    const criticalFiles = allFiles.filter(
      (f) => f.checkMs > threshold * 1000 || f.instantiations > 10000,
    );
    const totalProblematicSnippets = allFiles.reduce(
      (sum, f) => sum + f.problematicSnippets.length,
      0,
    );

    console.log(`\n📊 SUMMARY:`);
    console.log(`  • Total packages analyzed: ${results.length}`);
    console.log(`  • Total files analyzed: ${allFiles.length}`);
    console.log(
      `  • Critical files (> ${threshold}s or >10k instantiations): ${criticalFiles.length}`,
    );
    console.log(`  • Total problematic code snippets identified: ${totalProblematicSnippets}`);
    console.log(
      `  • Average LOC per file: ${(allFiles.reduce((sum, f) => sum + f.loc, 0) / allFiles.length).toFixed(0)}`,
    );
    console.log(
      `  • Average complexity per file: ${(allFiles.reduce((sum, f) => sum + f.complexity, 0) / allFiles.length).toFixed(0)}`,
    );

    if (criticalFiles.length > 0) {
      console.log('\n🚨 TOP CRITICAL FILES:');
      criticalFiles
        .sort((a, b) => b.checkMs - a.checkMs)
        .slice(0, 10)
        .forEach((f) => {
          console.log(
            `  • ${f.path} (${(f.checkMs / 1000).toFixed(2)}s, ${f.instantiations} inst, ${f.loc} LOC)`,
          );
        });
    }

    const out = jsonOut || join(TRACE_DIR, 'diagnosis-report.json');
    writeFileSync(
      out,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          threshold,
          summary: {
            totalPackages: results.length,
            totalFiles: allFiles.length,
            criticalFiles: criticalFiles.length,
            totalProblematicSnippets,
            avgLocPerFile: allFiles.reduce((sum, f) => sum + f.loc, 0) / allFiles.length,
            avgComplexityPerFile:
              allFiles.reduce((sum, f) => sum + f.complexity, 0) / allFiles.length,
          },
          results,
        },
        null,
        2,
      ),
    );
    console.log(`\n📁 Detailed diagnosis report written to ${out}`);
    console.log(
      'This JSON contains all key data needed for automated diagnosis and fix implementation.',
    );
    return;
  }

  console.log('Usage:');
  console.log('  bun run scripts/type-performance.ts run-all [--summary-json out.json]');
  console.log('  bun run scripts/type-performance.ts analyze <traceDir>');
  console.log('  bun run scripts/type-performance.ts audit [--json out.json] [--threshold 1.0]');
  console.log('  bun run scripts/type-performance.ts diagnose [--json out.json] [--threshold 1.0]');
}

main().catch((err) => {
  console.error('Tool failed:', err);
  process.exit(1);
});

#!/usr/bin/env bun
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';

/**
 * find-slow-types.ts
 *
 * This script identifies TypeScript performance bottlenecks across the monorepo.
 * It iterates through each package and app, runs a type check with tracing,
 * and identifies which ones are hitting recursion limits, running out of memory,
 * or taking an excessive amount of time.
 *
 * This is the primary tool for diagnosing tsserver crashes and IDE lag.
 */

const ROOT = process.cwd();
const TRACE_DIR = join(ROOT, '.type-traces');

interface Result {
  name: string;
  path: string;
  success: boolean;
  duration: number;
  error?: string;
}

async function runCheck(name: string, path: string): Promise<Result | null> {
  const tsconfigPath = join(ROOT, path, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) return null;

  process.stdout.write(`Checking ${name.padEnd(30)} ... `);

  const outputDir = join(TRACE_DIR, name.replace(/\//g, '-'));
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const start = Date.now();
  try {
    // Run tsc with tracing. Tracing is the best way to find why tsserver is slow/crashing.
    // We increase memory limit to ensure the trace completes even for heavy projects.
    execSync(`bunx tsc -p ${tsconfigPath} --noEmit --generateTrace ${outputDir} --skipLibCheck`, {
      stdio: 'pipe',
      cwd: ROOT,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' },
    });

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

async function main() {
  console.log('🚀 Starting Hominem TypeScript Performance Audit...\n');

  if (existsSync(TRACE_DIR)) rmSync(TRACE_DIR, { recursive: true });
  mkdirSync(TRACE_DIR);

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
  for (const target of targets) {
    const res = await runCheck(target.name, target.path);
    if (res) results.push(res);
  }

  // Final Summary Report
  console.log('\n' + '='.repeat(70));
  console.log('TYPE PERFORMANCE SUMMARY');
  console.log('='.repeat(70));

  const sorted = results.sort((a, b) => b.duration - a.duration);

  console.log(`\n${'STATUS'.padEnd(15)} | ${'TIME'.padEnd(8)} | ${'PROJECT'}`);
  console.log('-'.repeat(70));

  for (const res of sorted) {
    let status = '✅ OK';
    if (res.error === 'recursion_limit') status = '🔥 RECURSION';
    else if (res.error === 'oom') status = '💥 OOM';
    else if (res.error === 'type_errors') status = '⚠️ ERRORS';

    console.log(`${status.padEnd(15)} | ${res.duration.toFixed(2)}s | ${res.name}`);
  }

  const critical = results.filter((r) => r.error === 'recursion_limit' || r.error === 'oom');
  if (critical.length > 0) {
    console.log('\n🚨 CRITICAL PERFORMANCE ISSUES DETECTED:');
    critical.forEach((c) => {
      console.log(`- ${c.name} is likely causing your tsserver crashes.`);
    });
  }

  console.log('\n📊 Next Steps:');
  console.log('1. Open https://ui.perfetto.dev/ and drop in a trace.json from .type-traces/');
  console.log('2. Look for the longest "checkExpression" or "checkSourceFile" blocks.');
  console.log('3. Use @ark/attest to benchmark suspected types:');
  console.log('   attest(() => { type Test = SlowType; }).type.instantiations.lessThan(5000)');
  console.log('4. Simplify union types or use explicit return types to reduce inference load.');
}

main().catch((err) => {
  console.error('\nAudit failed unexpectedly:');
  console.error(err);
});

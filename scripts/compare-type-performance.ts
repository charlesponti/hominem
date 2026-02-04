#!/usr/bin/env bun

/**
 * Type Performance Comparison Tool
 * 
 * Compares current type performance against baseline to detect regressions.
 * 
 * Usage:
 *   bun run scripts/compare-type-performance.ts --baseline <baseline.json> --current <current.json>
 * 
 * Exit codes:
 *   0 - No significant regression
 *   1 - Performance regression detected (>20% increase in any package)
 *   2 - Critical regression (>50% increase or new critical errors)
 */

import { readFileSync, existsSync } from 'fs';

interface PackageResult {
  name: string;
  durationSec: number;
  errorType?: 'type_error' | 'recursion_limit' | 'oom';
  summary: {
    totalFiles: number;
    slowFiles: number;
    totalInstantiations: number;
    typeHubFiles: number;
  };
}

interface Report {
  generatedAt: string;
  threshold: number;
  results: PackageResult[];
}

function parseArgs(): { baseline: string; current: string } {
  const args = process.argv.slice(2);
  let baseline: string | undefined;
  let current: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--baseline' && args[i + 1]) baseline = args[i + 1];
    if (args[i] === '--current' && args[i + 1]) current = args[i + 1];
  }

  if (!baseline || !current) {
    console.error('Usage: bun run scripts/compare-type-performance.ts --baseline <file> --current <file>');
    process.exit(1);
  }

  return { baseline, current };
}

function loadReport(path: string): Report {
  if (!existsSync(path)) {
    throw new Error(`Report not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function formatChange(current: number, baseline: number): { text: string; pct: number; status: 'good' | 'warning' | 'critical' } {
  const diff = current - baseline;
  const pct = baseline > 0 ? (diff / baseline) * 100 : 0;

  const symbol = diff > 0 ? '+' : '';
  const text = `${symbol}${diff.toFixed(2)}s (${symbol}${pct.toFixed(1)}%)`;

  let status: 'good' | 'warning' | 'critical';
  if (pct > 50) status = 'critical';
  else if (pct > 20) status = 'warning';
  else status = 'good';

  return { text, pct, status };
}

function compareReports(baseline: Report, current: Report): {
  changes: Array<{
    name: string;
    baseline: number;
    current: number;
    change: { text: string; pct: number; status: string };
    newErrors?: string;
    resolvedErrors?: string;
  }>;
  regressions: number;
  criticalRegressions: number;
  improvements: number;
} {
  const baselineMap = new Map(baseline.results.map(r => [r.name, r]));
  const currentMap = new Map(current.results.map(r => [r.name, r]));

  const changes: Array<{
    name: string;
    baseline: number;
    current: number;
    change: { text: string; pct: number; status: string };
    newErrors?: string;
    resolvedErrors?: string;
  }> = [];

  let regressions = 0;
  let criticalRegressions = 0;
  let improvements = 0;

  // Compare all packages in current
  for (const [name, currentResult] of currentMap) {
    const baselineResult = baselineMap.get(name);

    if (!baselineResult) {
      // New package
      changes.push({
        name,
        baseline: 0,
        current: currentResult.durationSec,
        change: { text: 'NEW', pct: 0, status: 'good' },
        newErrors: currentResult.errorType,
      });
      continue;
    }

    const change = formatChange(currentResult.durationSec, baselineResult.durationSec);

    if (change.status === 'critical') criticalRegressions++;
    else if (change.status === 'warning') regressions++;
    else if (change.pct < -10) improvements++;

    const changeInfo: typeof changes[0] = {
      name,
      baseline: baselineResult.durationSec,
      current: currentResult.durationSec,
      change,
    };

    // Check for new errors
    if (!baselineResult.errorType && currentResult.errorType) {
      changeInfo.newErrors = currentResult.errorType;
      criticalRegressions++;
    }

    // Check for resolved errors
    if (baselineResult.errorType && !currentResult.errorType) {
      changeInfo.resolvedErrors = baselineResult.errorType;
      improvements++;
    }

    changes.push(changeInfo);
  }

  // Find removed packages
  for (const [name, baselineResult] of baselineMap) {
    if (!currentMap.has(name)) {
      changes.push({
        name,
        baseline: baselineResult.durationSec,
        current: 0,
        change: { text: 'REMOVED', pct: 0, status: 'good' },
      });
    }
  }

  return { changes, regressions, criticalRegressions, improvements };
}

function main() {
  const { baseline: baselinePath, current: currentPath } = parseArgs();

  console.log('📊 Type Performance Comparison\n');
  console.log(`Baseline: ${baselinePath}`);
  console.log(`Current:  ${currentPath}\n`);

  const baseline = loadReport(baselinePath);
  const current = loadReport(currentPath);

  const { changes, regressions, criticalRegressions, improvements } = compareReports(baseline, current);

  // Sort by severity
  const sortedChanges = changes.sort((a, b) => {
    const statusOrder = { critical: 0, warning: 1, good: 2 };
    return statusOrder[a.change.status] - statusOrder[b.change.status];
  });

  console.log('='.repeat(80));
  console.log('Package Changes');
  console.log('='.repeat(80));
  console.log('\nPackage                    | Baseline | Current  | Change              | Status');
  console.log('-'.repeat(80));

  for (const change of sortedChanges) {
    const name = change.name.padEnd(26);
    const baseline = change.baseline > 0 ? `${change.baseline.toFixed(2)}s`.padEnd(8) : 'N/A     ';
    const current = change.current > 0 ? `${change.current.toFixed(2)}s`.padEnd(8) : 'N/A     ';
    const changeText = change.change.text.padEnd(19);
    const status = change.change.status === 'critical' ? '🔥' :
                   change.change.status === 'warning' ? '⚠️ ' : '✅';

    let extra = '';
    if (change.newErrors) extra += ` [NEW: ${change.newErrors}]`;
    if (change.resolvedErrors) extra += ` [RESOLVED: ${change.resolvedErrors}]`;

    console.log(`${name} | ${baseline} | ${current} | ${changeText} | ${status}${extra}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`  Critical regressions: ${criticalRegressions}`);
  console.log(`  Warnings:             ${regressions}`);
  console.log(`  Improvements:         ${improvements}`);
  console.log(`  Total changes:        ${changes.length}`);

  if (criticalRegressions > 0) {
    console.log('\n🔥 Critical regressions detected!');
    console.log('   Some packages have >50% performance degradation or new critical errors.');
    process.exit(2);
  }

  if (regressions > 0) {
    console.log('\n⚠️  Performance regressions detected.');
    console.log('   Some packages have >20% performance degradation.');
    process.exit(1);
  }

  console.log('\n✅ No significant performance regressions detected.');
  process.exit(0);
}

main();

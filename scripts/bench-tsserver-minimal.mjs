#!/usr/bin/env node
/**
 * Minimal TypeScript editor benchmark: cold project open, then warm diagnostics.
 *
 * Usage:
 *   node scripts/bench-tsserver-minimal.mjs [--runs N] [--output FILE]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TsServerClient } from './lib/tsserver-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'apps/web/app/lib/hooks/use-stream-message.ts');
const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};
const runs = Number(valueFor('--runs') ?? 3);
const output = path.resolve(root, valueFor('--output') ?? '.cache/tsserver-benchmark.json');

if (args.includes('--help')) {
  console.log('Usage: node scripts/bench-tsserver-minimal.mjs [--runs N] [--output FILE]');
  process.exit(0);
}
if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer');

if (!existsSync(target)) throw new Error(`Benchmark target does not exist: ${target}`);

async function runOnce() {
  const client = new TsServerClient(root);
  try {
    let started = performance.now();
    await client.open(target, { timeoutMs: 45000 });
    const openMs = performance.now() - started;

    started = performance.now();
    const request = client.send('geterr', { files: [target], delay: 0 });
    const completed = await client.waitForEvent('requestCompleted', 45000);
    if (completed.body?.request_seq !== request) throw new Error('geterr seq mismatch');

    return { openMs, diagnosticsMs: performance.now() - started };
  } finally {
    client.kill();
  }
}

const measurements = [];
for (let index = 0; index < runs; index++) {
  process.stderr.write(`[bench-tsserver-minimal] run ${index + 1}/${runs}...\n`);
  measurements.push(await runOnce());
}

const median = (key) => {
  const values = measurements.map((measurement) => measurement[key]).sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
};
const result = {
  generatedAt: new Date().toISOString(),
  target: path.relative(root, target),
  runs,
  measurements,
  medianOpenMs: median('openMs'),
  medianDiagnosticsMs: median('diagnosticsMs'),
};

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${path.relative(root, output)}`);

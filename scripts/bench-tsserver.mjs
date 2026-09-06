#!/usr/bin/env node
/**
 * Benchmarks real tsserver (the language-service process editors talk to)
 * against this repo's actual tsconfig graph. Plain `tsc` timings don't
 * answer questions about tsserver-only compiler options — those are never
 * consulted by a `tsc -b` CLI build — so this drives the documented
 * tsserver protocol directly and measures the things an editor actually
 * waits on, for every real consumer of the generation-event types:
 *
 *   - open->projectLoadingFinish  (cold cost of opening a file)
 *   - geterr round trip           (time until diagnostics land)
 *   - references round trip       (cross-project "Find All References",
 *     run once from the source package, packages/chat)
 *
 * Usage:
 *   node scripts/bench-tsserver.mjs [--label TEXT] [--runs N] [--json]
 *
 * Run it once, edit tsconfig.base.json / a package's tsconfig.json / a
 * paths override, run it again, and diff the numbers. Nothing here
 * mutates repo files.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { rssMb, TsServerClient } from './lib/tsserver-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : 'run';
const runs = args.includes('--runs') ? Number(args[args.indexOf('--runs') + 1]) : 1;
const asJson = args.includes('--json');

// Every real consumer of the generation-event types, each with a distinct
// project-reference relationship to packages/chat (direct reference, no
// reference at all, or a reference to the non-composite packages/rpc).
const CONSUMERS = [
  {
    label: 'apps/web',
    file: path.join(root, 'apps/web/app/lib/hooks/use-stream-message.ts'),
    symbol: 'ChatGenerationController',
  },
  {
    label: 'apps/omiro',
    file: path.join(root, 'apps/omiro/services/chat/use-chat-generation.ts'),
    symbol: 'ChatClient',
  },
  {
    label: 'packages/db',
    file: path.join(root, 'packages/db/src/services/chats/chat-generation.repository.ts'),
    symbol: 'GenerationHistoryEventPayload',
  },
  {
    label: 'packages/rpc',
    file: path.join(root, 'packages/rpc/src/types/chat.types.ts'),
    symbol: 'ChatMessageItem',
  },
  {
    label: 'services/api',
    file: path.join(root, 'services/api/src/application/chat-generation.service.ts'),
    symbol: 'GenerationHistoryEvent',
  },
];

const SOURCE_FILE = path.join(root, 'packages/chat/src/generation-machine/types.ts');
const SOURCE_SYMBOL = 'GenerationHistoryEvent';

function findSymbolPosition(file, symbol, { declaration = false } = {}) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const symbolPattern = declaration
    ? new RegExp(
        `\\b(?:export\\s+)?(?:type|interface|class|function|const|let|var)\\s+${symbol}\\b`,
      )
    : new RegExp(`\\b${symbol}\\b`);
  for (const [index, line] of lines.entries()) {
    const match = symbolPattern.exec(line);
    if (match) return { line: index + 1, offset: match.index + 1 };
  }
  throw new Error(`Benchmark fixture drifted: could not find "${symbol}" in ${file}.`);
}

async function benchConsumer({ file, symbol }) {
  const client = new TsServerClient(root);
  try {
    let t0 = performance.now();
    await client.open(file, { timeoutMs: 45000 });
    const openToProjectLoad = performance.now() - t0;

    t0 = performance.now();
    const geterrSeq = client.send('geterr', { files: [file], delay: 0 });
    await client.waitForEvent('requestCompleted', 45000).then((msg) => {
      if (msg.body?.request_seq !== geterrSeq) throw new Error('geterr seq mismatch');
    });
    const geterr = performance.now() - t0;

    const { line, offset } = findSymbolPosition(file, symbol);
    const quickinfo = await client.request('quickinfo', { file, line, offset }, 30000);
    const sees = (quickinfo.body?.displayString ?? '').includes(symbol);

    return {
      openToProjectLoad,
      geterr,
      tsserverRssMb: rssMb(client.proc.pid),
      resolvedSymbol: sees,
    };
  } finally {
    client.kill();
  }
}

async function benchReferences() {
  const sourcePosition = findSymbolPosition(SOURCE_FILE, SOURCE_SYMBOL, { declaration: true });
  const client = new TsServerClient(root);
  try {
    await client.open(SOURCE_FILE, { waitForProjectLoad: false });
    const t0 = performance.now();
    const refsResponse = await client.request(
      'references',
      { file: SOURCE_FILE, ...sourcePosition },
      45000,
    );
    return {
      references: performance.now() - t0,
      referenceCount: refsResponse.body?.refs?.length ?? null,
    };
  } finally {
    client.kill();
  }
}

function fmt(ms) {
  return ms === undefined ? 'n/a' : `${ms.toFixed(0)}ms`;
}

const results = {};
for (const consumer of CONSUMERS) {
  const runsData = [];
  for (let i = 0; i < runs; i++) {
    process.stderr.write(`[bench-tsserver] ${label} / ${consumer.label} run ${i + 1}/${runs}...\n`);
    runsData.push(await benchConsumer(consumer));
  }
  const avg = (key) => runsData.reduce((sum, r) => sum + (r[key] ?? 0), 0) / runsData.length;
  results[consumer.label] = {
    openToProjectLoad: avg('openToProjectLoad'),
    geterr: avg('geterr'),
    tsserverRssMb: runsData[0].tsserverRssMb,
    resolvedSymbol: runsData[0].resolvedSymbol,
  };
}

process.stderr.write(`[bench-tsserver] ${label} / references (from packages/chat)...\n`);
results.references = await benchReferences();

if (asJson) {
  console.log(JSON.stringify({ label, runs, results }, null, 2));
} else {
  console.log(`\n=== ${label} (${runs} run${runs > 1 ? 's' : ''}) ===`);
  console.log(
    `${'consumer'.padEnd(14)} ${'open'.padStart(8)} ${'geterr'.padStart(8)} ${'RSS'.padStart(7)}  resolves?`,
  );
  for (const consumer of CONSUMERS) {
    const r = results[consumer.label];
    console.log(
      `${consumer.label.padEnd(14)} ${fmt(r.openToProjectLoad).padStart(8)} ${fmt(r.geterr).padStart(8)} ${(r.tsserverRssMb ?? 'n/a') + 'MB'.padStart(2)}  ${r.resolvedSymbol ? 'yes' : 'NO'}`,
    );
  }
  console.log(
    `\nreferences (packages/chat, cross-project): ${fmt(results.references.references)}, found ${results.references.referenceCount}`,
  );
}

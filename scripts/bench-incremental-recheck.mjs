#!/usr/bin/env node
/**
 * Measures the one scenario `assumeChangesOnlyAffectDirectDependencies`
 * actually affects: an already-warm tsserver session re-checking a
 * downstream consumer after an UPSTREAM file changes. A cold `open` (what
 * bench-tsserver.mjs measures) never exercises this — the flag only
 * matters for incremental re-checks against already-loaded projects.
 *
 * Sequence: open the consumer file (warm up), edit an upstream source file
 * on disk, then re-request diagnostics on the consumer and time the round
 * trip. The edit is always reverted, including on failure.
 *
 * Usage: node scripts/bench-incremental-recheck.mjs [--label TEXT] [--runs N]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TsServerClient } from './lib/tsserver-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : 'run';
const runs = args.includes('--runs') ? Number(args[args.indexOf('--runs') + 1]) : 1;

// Upstream: the shallowest, most-depended-on file in the generation-event
// graph. Downstream: the deepest consumer (5+ hops through chat -> rpc ->
// app hooks), the worst case for a transitive-closure recheck.
const UPSTREAM_FILE = path.join(root, 'packages/chat/src/generation-machine/types.ts');
const DOWNSTREAM_FILE = path.join(root, 'apps/web/app/lib/hooks/use-stream-message.ts');
const MARKER_LINE = '// bench-incremental-recheck marker\n';

async function runOnce() {
  const client = new TsServerClient(root);
  const original = readFileSync(UPSTREAM_FILE, 'utf8');
  try {
    // Warm up: open + first diagnostics pass.
    await client.open(DOWNSTREAM_FILE, { timeoutMs: 45000 });
    let seq = client.send('geterr', { files: [DOWNSTREAM_FILE], delay: 0 });
    await client.waitForEvent('requestCompleted', 45000);

    // Also open the upstream file so tsserver tracks edits to it directly
    // (matches how an editor would have it open while you type).
    await client.open(UPSTREAM_FILE, { waitForProjectLoad: false });

    // Simulate an edit: prepend a marker line, tell tsserver via `change`,
    // and write it to disk (tsserver's file-watcher path matters too).
    client.send('change', {
      file: UPSTREAM_FILE,
      line: 1,
      offset: 1,
      endLine: 1,
      endOffset: 1,
      insertString: MARKER_LINE,
    });
    writeFileSync(UPSTREAM_FILE, MARKER_LINE + original);

    const t0 = performance.now();
    seq = client.send('geterr', { files: [DOWNSTREAM_FILE], delay: 0 });
    await client.waitForEvent('requestCompleted', 45000).then((msg) => {
      if (msg.body?.request_seq !== seq) throw new Error('geterr seq mismatch');
    });
    return performance.now() - t0;
  } finally {
    writeFileSync(UPSTREAM_FILE, original);
    client.kill();
  }
}

const times = [];
for (let i = 0; i < runs; i++) {
  process.stderr.write(`[bench-incremental-recheck] ${label} run ${i + 1}/${runs}...\n`);
  times.push(await runOnce());
}
const avg = times.reduce((a, b) => a + b, 0) / times.length;
console.log(
  `\n=== ${label}: incremental recheck after upstream edit (${runs} run${runs > 1 ? 's' : ''}) ===`,
);
console.log(`avg ${avg.toFixed(0)}ms  (${times.map((t) => t.toFixed(0)).join(', ')}ms)`);

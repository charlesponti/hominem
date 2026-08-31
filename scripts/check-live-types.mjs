#!/usr/bin/env node
/**
 * Answers the actual question behind the dev:types watcher: if you edit a
 * type in packages/chat WITHOUT rebuilding, does a given consumer's
 * language-service session see the edit live, or does it stay stuck on
 * whatever `.d.ts` is sitting in that package's build/ directory?
 *
 * Method: temporarily add a unique JSDoc marker above a real exported
 * declaration in packages/chat (no shape change, so nothing can fail to
 * typecheck), then for each consumer spawn tsserver — the same protocol
 * VS Code's TS extension speaks — open the consuming file, and ask
 * `quickinfo` at the import site. If the marker text comes back in the
 * hover documentation, that consumer is reading live source. If not, it's
 * reading stale build output. The source edit is always reverted,
 * including on failure.
 *
 * Usage: node scripts/check-live-types.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TsServerClient } from './lib/tsserver-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => path.join(root, ...parts);

const SOURCE_FILE = p('packages/chat/src/generation-machine/types.ts');
const now = Date.now();

const MARKERS = [
  {
    marker: `LIVE_CHECK_PAYLOAD_${now}`,
    declarationMatch: 'export type GenerationHistoryEventPayload =',
  },
  {
    marker: `LIVE_CHECK_EVENT_${now}`,
    declarationMatch: 'export type GenerationHistoryEvent = {',
  },
];

const PROBES = [
  {
    label: 'packages/db (has an explicit tsconfig `paths` override to build/*.d.ts)',
    file: p('packages/db/src/services/chats/chat-generation.repository.ts'),
    line: 4,
    offset: 8,
    marker: MARKERS[0].marker,
  },
  {
    label: 'services/api (plain `references`, no override)',
    file: p('services/api/src/rpc/routes/chats.ts'),
    line: 11,
    offset: 3,
    marker: MARKERS[0].marker,
  },
  {
    label: 'packages/rpc (has an explicit tsconfig `paths` override to build/*.d.ts)',
    file: p('packages/rpc/src/generation-client-events.ts'),
    line: 4,
    offset: 3,
    marker: MARKERS[1].marker,
  },
];

function applyMarkers(original) {
  let text = original;
  for (const { marker, declarationMatch } of MARKERS) {
    if (!text.includes(declarationMatch)) {
      throw new Error(`Fixture drifted: "${declarationMatch}" not found in ${SOURCE_FILE}`);
    }
    text = text.replace(declarationMatch, `/** ${marker} */\n${declarationMatch}`);
  }
  return text;
}

async function probeOne({ label, file, line, offset, marker }) {
  const client = new TsServerClient(root);
  try {
    await client.open(file, { timeoutMs: 45000 });
    const response = await client.request('quickinfo', { file, line, offset }, 30000);
    const doc = response.body?.documentation ?? '';
    const displayString = response.body?.displayString ?? '';
    const seesLive = doc.includes(marker) || displayString.includes(marker);
    return { label, seesLive, raw: doc || displayString };
  } finally {
    client.kill();
  }
}

const original = readFileSync(SOURCE_FILE, 'utf8');
let restored = false;
function restore() {
  if (restored) return;
  writeFileSync(SOURCE_FILE, original);
  restored = true;
}
process.on('SIGINT', () => {
  restore();
  process.exit(1);
});

try {
  writeFileSync(SOURCE_FILE, applyMarkers(original));

  console.log(`Edited (unbuilt) ${path.relative(root, SOURCE_FILE)} with markers:`);
  for (const { marker, declarationMatch } of MARKERS)
    console.log(`  ${marker} -> ${declarationMatch}`);
  console.log();

  const results = [];
  for (const probe of PROBES) {
    process.stderr.write(`[check-live-types] probing ${probe.label}...\n`);
    results.push(await probeOne(probe));
  }

  console.log('\n=== live-type visibility (no rebuild of packages/chat) ===');
  for (const r of results) {
    console.log(`${r.seesLive ? '✅ LIVE ' : '❌ STALE'}  ${r.label}`);
  }
} finally {
  restore();
  console.log(`\nReverted ${path.relative(root, SOURCE_FILE)}.`);
}

#!/usr/bin/env node
/**
 * Same method as check-live-types.mjs, but for the second hop: does a
 * consumer of packages/rpc's own exported types see a live edit, or is it
 * stuck on whatever build/*.d.ts rpc's own `tsc -p tsconfig.emit.json`
 * last emitted? rpc is deliberately non-composite (Hono AppType inference),
 * so no consumer can ever get a live-source project-reference redirect
 * into it — this tests whether that theory holds and quantifies exactly
 * who depends on the rpc-specific watcher process.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TsServerClient } from './lib/tsserver-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => path.join(root, ...parts);

const SOURCE_FILE = p('packages/rpc/src/types/generation-events.ts');
const now = Date.now();
const MARKER = `LIVE_CHECK_RPC_${now}`;
const DECLARATION_MATCH = 'export type GenerationDomainEvent = {';

const PROBES = [
  {
    label: 'apps/web (imports GenerationDomainEvent from @hominem/rpc/types)',
    file: p('apps/web/app/lib/hooks/use-start-chat.ts'),
    line: 3,
    offset: 31,
  },
  {
    label: 'apps/omiro (imports GenerationDomainEvent from @hominem/rpc/types)',
    file: p('apps/omiro/services/chat/use-start-chat.ts'),
    line: 5,
    offset: 15,
  },
];

async function probeOne({ label, file, line, offset }) {
  const client = new TsServerClient(root);
  try {
    await client.open(file, { timeoutMs: 45000 });
    const response = await client.request('quickinfo', { file, line, offset }, 30000);
    const doc = response.body?.documentation ?? '';
    const displayString = response.body?.displayString ?? '';
    return { label, seesLive: doc.includes(MARKER) || displayString.includes(MARKER) };
  } finally {
    client.kill();
  }
}

const original = readFileSync(SOURCE_FILE, 'utf8');
if (!original.includes(DECLARATION_MATCH)) {
  throw new Error(`Fixture drifted: "${DECLARATION_MATCH}" not found in ${SOURCE_FILE}`);
}
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
  writeFileSync(
    SOURCE_FILE,
    original.replace(DECLARATION_MATCH, `/** ${MARKER} */\n${DECLARATION_MATCH}`),
  );
  console.log(`Edited (unbuilt) ${path.relative(root, SOURCE_FILE)} with marker ${MARKER}\n`);

  const results = [];
  for (const probe of PROBES) {
    process.stderr.write(`[check-live-types-rpc] probing ${probe.label}...\n`);
    results.push(await probeOne(probe));
  }

  console.log('=== live-type visibility (no rebuild of packages/rpc) ===');
  for (const r of results) console.log(`${r.seesLive ? '✅ LIVE ' : '❌ STALE'}  ${r.label}`);
} finally {
  restore();
  console.log(`\nReverted ${path.relative(root, SOURCE_FILE)}.`);
}

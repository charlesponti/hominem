#!/usr/bin/env node
/**
 * Same method as check-live-types.mjs, but for the second hop: does the RPC
 * type barrel see a live edit to a canonical chat type, or is it stuck on
 * whatever declaration packages/rpc last emitted? RPC owns transport and
 * endpoint types; chat owns the runtime contracts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TsServerClient } from './lib/tsserver-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => path.join(root, ...parts);

const SOURCE_FILE = p('packages/chat/src/chat.types.ts');
const now = Date.now();
const MARKER = `LIVE_CHECK_RPC_${now}`;
const DECLARATION_MATCH = 'export interface ChatMessageItem {';

const PROBES = [
  {
    label: 'packages/rpc (re-exports ChatMessageItem from @hominem/chat/types)',
    file: p('packages/rpc/src/types/chat.types.ts'),
    line: 6,
    offset: 3,
  },
  {
    label: 'apps/web (imports canonical chat types directly)',
    file: p('apps/web/app/lib/hooks/use-start-chat.ts'),
    line: 2,
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

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';

/**
 * One-time interactive login to capture a reusable session for
 * gallery-screenshot.ts's authenticated presets (dashboard, pipeline).
 *
 *   pnpm --filter @hominem/career gallery:login
 *
 * Opens a real, visible browser window pointed at /auth. You log in there
 * yourself — this script never sees your credentials, it only watches for
 * the URL to leave /auth — then saves the resulting cookies/storage to
 * apps/career/.auth/storage-state.json (already gitignored at the repo
 * root). gallery-screenshot.ts picks that file up automatically if present.
 *
 * Re-run this whenever the saved session expires.
 */

const DEFAULT_BASE_URL = 'http://localhost:4451';
const DEFAULT_OUT_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.auth/storage-state.json',
);
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes to complete login by hand

function parseOptions() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'base-url': { type: 'string' },
      'out-file': { type: 'string' },
    },
    strict: true,
  });

  return {
    baseUrl: values['base-url'] ?? DEFAULT_BASE_URL,
    outFile: values['out-file'] ? path.resolve(values['out-file']) : DEFAULT_OUT_FILE,
  };
}

async function main() {
  const opts = parseOptions();
  await mkdir(path.dirname(opts.outFile), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${opts.baseUrl}/auth`, { waitUntil: 'networkidle' });
  console.log(
    '\nA browser window has opened. Log in there — this script never touches your credentials.',
  );
  console.log(`Waiting up to ${LOGIN_TIMEOUT_MS / 60000} minutes for login to complete...\n`);

  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), {
    timeout: LOGIN_TIMEOUT_MS,
  });
  // Give the post-login redirect a moment to fully settle.
  await page.waitForLoadState('networkidle');

  await context.storageState({ path: opts.outFile });
  console.log(`Saved session: ${opts.outFile}`);

  await browser.close();
}

await main();

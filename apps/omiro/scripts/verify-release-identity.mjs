#!/usr/bin/env node
// Preflight guard for production releases. Resolves the app config the same
// way `eas build`/`eas submit` will and refuses to proceed if it doesn't
// match the identity registered in App Store Connect (ascAppId 6760221796
// in eas.json's submit.production.ios). This is the check that would have
// caught the incident where a locally-run "production" build silently
// shipped the dev app identity (com.pontistudios.hakumi.dev) to Apple.
//
// Keep these in sync with app.config.js's PRODUCTION_APP_CONFIG.
const EXPECTED = {
  bundleIdentifier: 'com.pontistudios.hakumi',
  name: 'Omiro',
  appEnvironment: 'production',
};

import { execFileSync } from 'node:child_process';

function resolveConfig() {
  const raw = execFileSync('npx', ['expo', 'config', '--json'], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8',
  });
  return JSON.parse(raw);
}

function main() {
  const config = resolveConfig();
  const actual = {
    bundleIdentifier: config.ios?.bundleIdentifier,
    name: config.name,
    appEnvironment: config.extra?.appEnvironment,
  };

  const mismatches = Object.entries(EXPECTED).filter(([key, value]) => actual[key] !== value);

  if (mismatches.length > 0) {
    console.error('Release identity check failed. Refusing to build/submit for the App Store.');
    console.error();
    for (const [key, expected] of mismatches) {
      console.error(`  ${key}: expected "${expected}", got "${actual[key]}"`);
    }
    console.error();
    console.error(
      'This usually means APP_ENV resolved to something other than "production" ' +
        '(check for a stray .env.*.local file, or run this from CI instead of locally).',
    );
    process.exit(1);
  }

  console.log('Release identity check passed:', actual);
}

main();

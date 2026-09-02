#!/usr/bin/env node
// Dev entry point: runs the server under tsx watch, and in the same
// process keeps public/login.js (the hosted-login page's client bundle)
// rebuilt from src/routes/login/browser.ts. That file is a committed
// build artifact that tsx watch has no reason to know about, so without
// this it silently drifts from its source during local dev.
import { spawn } from 'node:child_process';

import { watch } from 'rolldown';

import { loginClientBuildOptions } from './login-client-bundle.mjs';

// Resolve tsx from this package's own node_modules/.bin rather than relying
// on PATH, so this works the same whether it's invoked through a pnpm
// script (PATH already has node_modules/.bin) or run directly.
const tsxBin = new URL('../node_modules/.bin/tsx', import.meta.url).pathname;

const server = spawn(tsxBin, ['watch', '--tsconfig', 'tsconfig.dev.json', 'src/index.ts'], {
  stdio: 'inherit',
  env: process.env,
});

const clientWatcher = watch(loginClientBuildOptions);
clientWatcher.on('event', (event) => {
  if (event.code === 'BUNDLE_END') {
    console.log(`[login.js] rebuilt in ${event.duration}ms`);
  } else if (event.code === 'ERROR') {
    console.error('[login.js] build failed:', event.error);
  }
});

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  clientWatcher.close();
  server.kill();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('exit', (code) => {
  clientWatcher.close();
  process.exit(code ?? 0);
});

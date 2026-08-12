import type { FullConfig } from '@playwright/test';

const API_BASE_URL = 'http://localhost:4040';
const APP_BASE_URL = 'http://localhost:4451';
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 1000;

async function waitForEndpoint(url: string, maxRetries: number): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.status < 500) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  throw new Error(`Server at ${url} did not become ready after ${maxRetries} retries`);
}

async function waitForAppSsr(url: string, maxRetries: number): Promise<void> {
  // The career app in dev mode does a full SSR build on the first real
  // request; wait until that request completes (may take >15s).
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.status < 500) return;
    } catch {
      // build in progress, wait
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  throw new Error(`App at ${url} did not become ready after ${maxRetries} retries`);
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await Promise.all([
    waitForEndpoint(API_BASE_URL, MAX_RETRIES),
    waitForAppSsr(`${APP_BASE_URL}/auth`, MAX_RETRIES),
  ]);
}

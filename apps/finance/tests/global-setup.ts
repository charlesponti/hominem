import type { FullConfig } from '@playwright/test';

const API_BASE_URL = 'http://localhost:4040';
const APP_BASE_URL = 'http://localhost:4444';
const MAX_RETRIES = 20;
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
  // in dev mode the app's first real request triggers a full SSR build, which can take 15s+
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (res.status < 500) return;
    } catch {
      // build in progress, wait
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  throw new Error(`App SSR at ${url} did not become ready after ${maxRetries} retries`);
}

export default async function globalSetup(config: FullConfig) {
  void config;
  await waitForEndpoint(`${API_BASE_URL}/`, MAX_RETRIES);

  // react-router dev mode kicks off the Vite build pipeline on the first SSR request,
  // which can take 20-30s - wait here so the first test doesn't eat that cost
  await waitForAppSsr(`${APP_BASE_URL}/auth`, 60);
}

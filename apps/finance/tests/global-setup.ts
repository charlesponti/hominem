import type { FullConfig } from '@playwright/test'

const API_BASE_URL = 'http://localhost:4040'
const APP_BASE_URL = 'http://localhost:4444'
const MAX_RETRIES = 20
const RETRY_DELAY_MS = 1000

async function waitForEndpoint(url: string, maxRetries: number): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
      if (res.status < 500) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
  }
  throw new Error(`Server at ${url} did not become ready after ${maxRetries} retries`)
}

async function warmUpFinanceAppAction(): Promise<void> {
  // Trigger the /auth action (POST) to warm up React Router's SSR action pipeline.
  // In dev mode, actions may compile lazily on first use.
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(`${APP_BASE_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'email=warmup%40hominem.test',
        redirect: 'manual',
        signal: AbortSignal.timeout(30000),
      })
      // 302 redirect means action ran and succeeded (OTP sent)
      // 200 means action ran and returned data (error case)
      // Either is acceptable — we just need the action to have run
      if (res.status < 500) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
  }
}

async function waitForAppSsr(url: string, maxRetries: number): Promise<void> {
  // The finance app in dev mode does a full SSR build on the first real request.
  // We must wait until that SSR request completes (may take >15s) before tests run.
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      // A successful SSR response will be HTML with 200 or a redirect (3xx)
      if (res.status < 500) return
    } catch {
      // build in progress, wait
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
  }
  throw new Error(`App SSR at ${url} did not become ready after ${maxRetries} retries`)
}

export default async function globalSetup(_config: FullConfig) {
  // Wait for the API to accept connections.
  await waitForEndpoint(`${API_BASE_URL}/`, MAX_RETRIES)

  // Wait for the finance app to finish its initial SSR build AND process a real request.
  // In react-router dev mode, the first SSR request triggers the Vite build pipeline
  // which can take 20-30s. We wait here so the first test doesn't hit a slow build.
  await waitForAppSsr(`${APP_BASE_URL}/auth`, 60)

  // Prime the SSR action pipeline and OTP path to avoid cold-start on the first test.
  await warmUpFinanceAppAction()
}

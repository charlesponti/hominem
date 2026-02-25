import { performance } from 'node:perf_hooks'

import { db, eq } from '@hominem/db'
import { health } from '@hominem/db/schema/health'
import { users } from '@hominem/db/schema/users'
import { Hono } from 'hono'

import { createTokenPairForUser } from '../auth/session-store'
import { authJwtMiddleware } from './auth'

const WARMUP_REQUESTS = 50
const MEASURED_REQUESTS = 500

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? 0
}

function summarize(label: string, samples: number[]) {
  const p50 = percentile(samples, 50)
  const p95 = percentile(samples, 95)
  const p99 = percentile(samples, 99)
  const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length

  return {
    metric: label,
    warmupRequests: WARMUP_REQUESTS,
    measuredRequests: MEASURED_REQUESTS,
    p50: Number(p50.toFixed(3)),
    p95: Number(p95.toFixed(3)),
    p99: Number(p99.toFixed(3)),
    mean: Number(mean.toFixed(3)),
    targetP95: 2,
    targetMet: p95 < 2,
  }
}

async function main() {
  process.env.NODE_ENV = 'test'

  const userId = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(users).values({
    id: userId,
    email: `auth-perf-${userId}@example.com`,
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
  })

  try {
    const tokenPair = await createTokenPairForUser({
      userId,
      role: 'user',
      scope: ['api:read'],
      amr: ['perf'],
    })
    const token = tokenPair.accessToken

    const benchmarkApp = new Hono()
    benchmarkApp.use('*', authJwtMiddleware())
    benchmarkApp.get('/bench', (c) => c.json({ ok: true }))

    const statusApp = new Hono()
    statusApp.use('*', authJwtMiddleware())
    statusApp.get('/status', async (c) => {
      await db.select().from(health).limit(1)
      return c.json({ ok: true })
    })

    const makeRequest = async (requester: () => Promise<Response>) => {
      const requestStart = performance.now()
      const response = await requester()
      if (response.status !== 200) {
        const body = await response.text()
        throw new Error(`Unexpected status ${response.status}: ${body}`)
      }
      return performance.now() - requestStart
    }

    const benchRequester = async () =>
      await benchmarkApp.request('/bench', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    const fullStackRequester = async () =>
      await statusApp.request('/status', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    for (let i = 0; i < WARMUP_REQUESTS; i += 1) {
      await makeRequest(benchRequester)
    }

    const middlewareSamples: number[] = []
    for (let i = 0; i < MEASURED_REQUESTS; i += 1) {
      middlewareSamples.push(await makeRequest(benchRequester))
    }

    for (let i = 0; i < WARMUP_REQUESTS; i += 1) {
      await makeRequest(fullStackRequester)
    }

    const fullStackSamples: number[] = []
    for (let i = 0; i < MEASURED_REQUESTS; i += 1) {
      fullStackSamples.push(await makeRequest(fullStackRequester))
    }

    const middlewareStats = summarize('auth_middleware_latency_ms', middlewareSamples)
    const fullStackStats = summarize('auth_plus_db_handler_latency_ms', fullStackSamples)

    console.log(
      JSON.stringify(
        [middlewareStats, fullStackStats],
        null,
        2
      )
    )
  } finally {
    await db.delete(users).where(eq(users.id, userId))
  }
}

void main()

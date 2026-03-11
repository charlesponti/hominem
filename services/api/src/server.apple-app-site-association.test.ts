import { beforeEach, describe, expect, test, vi } from 'vitest'

async function importServer() {
  const module = await import('./server')
  return module.createServer
}

describe('apple app site association route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NODE_ENV = 'test'
    process.env.APPLE_TEAM_ID = '3QHJ2KN8AL'
  })

  test('serves webcredentials app ids for mobile variants', async () => {
    const createServer = await importServer()
    const app = createServer()

    const response = await app.request('http://localhost/.well-known/apple-app-site-association')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = (await response.json()) as {
      webcredentials: {
        apps: string[]
      }
    }

    expect(body.webcredentials.apps).toEqual([
      '3QHJ2KN8AL.com.pontistudios.hakumi',
      '3QHJ2KN8AL.com.pontistudios.hakumi.preview',
      '3QHJ2KN8AL.com.pontistudios.hakumi.dev',
      '3QHJ2KN8AL.com.pontistudios.hakumi.e2e',
    ])
  })
})

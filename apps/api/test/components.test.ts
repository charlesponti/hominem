import { describe, expect, it } from 'vitest'
import { createServer } from '../src/server.js'

describe('Components API', () => {
  it('should serve the use-api-client registry', async () => {
    const app = createServer()

    const res = await app.request('/components/use-api-client.json')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json')

    const data = await res.json()
    expect(data).toHaveProperty('name', 'use-api-client')
    expect(data).toHaveProperty('type', 'registry:hook')
    expect(data).toHaveProperty('title', 'API Client Hook')
  })

  it('should list available components', async () => {
    const app = createServer()

    const res = await app.request('/components')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json')

    const data = (await res.json()) as { components: Array<{ name: string }>; count: number }
    expect(data).toHaveProperty('components')
    expect(data).toHaveProperty('count')
    expect(data.components).toHaveLength(1)
    expect(data.components[0]).toHaveProperty('name', 'use-api-client')
  })

  it('should handle 404 for missing registry files', async () => {
    const app = createServer()

    // Mock a missing file by testing a non-existent component
    const res = await app.request('/components/non-existent.json')

    expect(res.status).toBe(404)
  })
})

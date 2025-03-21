import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer } from '../server'

describe('server', () => {
  let testServer: FastifyInstance

  beforeAll(async () => {
    const server = await createServer({ logger: false })
    if (!server) {
      throw new Error('Server is null')
    }
    testServer = server
    await testServer.ready()
  })

  afterAll(async () => {
    if (!testServer) {
      return
    }

    await testServer.close()
  })

  test('status endpoint returns 200', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/status',
    })
    const body = JSON.parse(response.body) as {
      up: boolean
      isAuth: boolean
      serverTime: string
      uptime: number
    }
    expect(response).toBe(200)
    expect(body.up).toEqual(true)
  })
})

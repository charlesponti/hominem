import type { FastifyReply, FastifyRequest } from 'fastify'
import { vi } from 'vitest'

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function getMockRequest(session: any = {}): FastifyRequest {
  return {
    session,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  } as any as FastifyRequest
}

export function getMockReply(): FastifyReply {
  return {
    code: vi.fn(),
    send: vi.fn(),
    log: {
      error: vi.fn(),
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  } as any as FastifyReply
}

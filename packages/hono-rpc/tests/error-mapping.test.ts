import { describe, expect, it } from 'vitest'

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceError,
} from '../src/errors'
import { mapApiError } from '../src/middleware/error'

describe('mapApiError', () => {
  it('maps NotFoundError to 404', () => {
    const result = mapApiError(new NotFoundError('Task'))
    expect(result.status).toBe(404)
    expect(result.body.code).toBe('NOT_FOUND')
  })

  it('maps ForbiddenError to 403', () => {
    const result = mapApiError(new ForbiddenError('Forbidden'))
    expect(result.status).toBe(403)
    expect(result.body.code).toBe('FORBIDDEN')
  })

  it('maps ConflictError to 409', () => {
    const result = mapApiError(new ConflictError('Conflict'))
    expect(result.status).toBe(409)
    expect(result.body.code).toBe('CONFLICT')
  })

  it('maps generic errors to 500', () => {
    const result = mapApiError(new Error('boom'))
    expect(result.status).toBe(500)
    expect(result.body.code).toBe('INTERNAL_ERROR')
  })

  it('returns details for ServiceError', () => {
    const result = mapApiError(
      new ServiceError('bad input', 'VALIDATION_ERROR', 400, { field: 'title' }),
    )
    expect(result.status).toBe(400)
    expect(result.body.details).toEqual({ field: 'title' })
  })
})

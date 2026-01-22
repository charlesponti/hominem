import type { Context } from 'hono'
import { ZodError } from 'zod'

export class ApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'ApiError'
  }
}

export function handleError(error: Error, c: Context) {
  if (error instanceof ApiError) {
    return c.json(
      {
        error: error.message,
      },
      error.statusCode as 400 | 401 | 403 | 404 | 500
    )
  }

  if (error instanceof ZodError) {
    return c.json(
      {
        error: 'Validation Error',
        details: error.issues,
      },
      400
    )
  }

  // Log unknown errors
  console.error(error)

  return c.json(
    {
      error: 'Internal Server Error',
    },
    500
  )
}

export function NotFoundError(message = 'Not found') {
  return new ApiError(404, message)
}

export function ForbiddenError(message = 'Forbidden') {
  return new ApiError(403, message)
}

export function UnauthorizedError(message = 'Unauthorized') {
  return new ApiError(401, message)
}

export function BadRequestError(message = 'Bad request') {
  return new ApiError(400, message)
}

import type { FastifyReply } from 'fastify'
import { ZodError } from 'zod'

export class ApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'ApiError'
  }
}

export function handleError(error: Error, reply: FastifyReply) {
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      error: error.message,
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      details: error.errors,
    })
  }

  // Log unknown errors
  console.error(error)

  return reply.status(500).send({
    error: 'Internal Server Error',
  })
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

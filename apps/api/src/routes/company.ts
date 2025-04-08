import { db } from '@hominem/utils/db'
import { companies } from '@hominem/utils/schema'
import { ilike } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors'

const searchParamSchema = z.object({
  query: z.string().min(1),
})

const companyNameSchema = z.object({
  name: z.string().min(1),
})

export async function companyRoutes(fastify: FastifyInstance) {
  // Search companies by name
  fastify.get('/search', async (request, reply) => {
    try {
      const { query } = searchParamSchema.parse(request.query)

      const results = await db
        .select()
        .from(companies)
        .where(ilike(companies.name, `%${query}%`))
        .limit(10)

      return results
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Create a company with just a name
  fastify.post('/', async (request, reply) => {
    try {
      const { name } = companyNameSchema.parse(request.body)

      const results = await db
        .insert(companies)
        .values({
          name,
          description: '',
          website: '',
          industry: '',
          size: '',
          location: {},
        })
        .returning()

      return results[0]
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}

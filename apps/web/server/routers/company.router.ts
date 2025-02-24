import { db } from '@ponti/utils/db'
import { companies } from '@ponti/utils/schema'
import { ilike } from 'drizzle-orm'
import { z } from 'zod'
import { publicProcedure, router } from '../trpc'

export const companyRouter = router({
  search: publicProcedure.input(z.string().min(1)).query(async ({ input }) => {
    const results = await db
      .select()
      .from(companies)
      .where(ilike(companies.name, `%${input}%`))
      .limit(10)
    return results
  }),

  createWithName: publicProcedure.input(z.string().min(1)).mutation(async ({ input }) => {
    return await db
      .insert(companies)
      .values({
        name: input,
        description: '',
        website: '',
        industry: '',
        size: '',
        location: {},
      })
      .returning()
  }),
})

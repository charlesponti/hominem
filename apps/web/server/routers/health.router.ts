import { db } from '@ponti/utils/db'
import { health } from '@ponti/utils/schema'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { z } from 'zod'
import { publicProcedure, router } from '../trpc'

export const healthRouter = router({
  getHealthData: publicProcedure
    .input(
      z
        .object({
          userId: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          activityType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      // Build filter conditions array for better type handling
      const conditions = []

      if (input?.userId) {
        conditions.push(eq(health.userId, input.userId))
      }

      if (input?.startDate) {
        conditions.push(gte(health.date, input.startDate))
      }

      if (input?.endDate) {
        conditions.push(lte(health.date, input.endDate))
      }

      if (input?.activityType) {
        conditions.push(eq(health.activityType, input.activityType))
      }

      // If we have conditions, apply them with AND
      if (conditions.length > 0) {
        return db
          .select()
          .from(health)
          .where(and(...conditions))
          .orderBy(desc(health.date))
      }

      // Otherwise return all data
      return db.select().from(health).orderBy(desc(health.date))
    }),

  getHealthDataById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const result = await db.select().from(health).where(eq(health.id, input)).limit(1)

    return result[0] || null
  }),

  addHealthData: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        date: z.date(),
        activityType: z.string(),
        duration: z.number(),
        caloriesBurned: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(health).values(input).returning()
      return result[0]
    }),

  updateHealthData: publicProcedure
    .input(
      z.object({
        id: z.number(),
        date: z.date().optional(),
        activityType: z.string().optional(),
        duration: z.number().optional(),
        caloriesBurned: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      const result = await db.update(health).set(updateData).where(eq(health.id, id)).returning()

      return result[0]
    }),

  deleteHealthData: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    await db.delete(health).where(eq(health.id, input))
    return { success: true }
  }),
})

import { db } from '@hominem/data'
import { goals } from '@hominem/data/schema'
import { and, asc, desc, eq, ilike, ne } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../index'

export const goalsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        showArchived: z.boolean().optional().default(false),
        sortBy: z.string().optional().default('priority'),
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { showArchived, sortBy, category } = input
      const whereClauses = [eq(goals.userId, ctx.userId)]

      if (!showArchived) {
        whereClauses.push(ne(goals.status, 'archived'))
      }

      if (category) {
        whereClauses.push(ilike(goals.goalCategory, `%${category}%`))
      }

      const orderBy =
        sortBy === 'dueDate'
          ? [asc(goals.dueDate)]
          : sortBy === 'createdAt'
            ? [desc(goals.createdAt)]
            : [asc(goals.priority)]

      const userGoals = await db
        .select()
        .from(goals)
        .where(and(...whereClauses))
        .orderBy(...orderBy)

      return userGoals
    }),
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [goal] = await db
        .select()
        .from(goals)
        .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.userId)))
      return goal
    }),
  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        goalCategory: z.string().optional(),
        status: z.enum(['todo', 'in_progress', 'completed', 'archived']).default('todo'),
        priority: z.number().optional(),
        startDate: z.string().optional(),
        dueDate: z.string().optional(),
        milestones: z
          .array(
            z.object({
              description: z.string(),
              completed: z.boolean().default(false),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [goal] = await db
        .insert(goals)
        .values({ ...input, userId: ctx.userId })
        .returning()
      return goal
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().optional(),
        description: z.string().optional(),
        goalCategory: z.string().optional(),
        status: z.enum(['todo', 'in_progress', 'completed', 'archived']).optional(),
        priority: z.number().optional(),
        startDate: z.string().optional(),
        dueDate: z.string().optional(),
        milestones: z
          .array(
            z.object({
              description: z.string(),
              completed: z.boolean().default(false),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input
      const [goal] = await db
        .update(goals)
        .set(data)
        .where(and(eq(goals.id, id), eq(goals.userId, ctx.userId)))
        .returning()
      return goal
    }),
  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [goal] = await db
        .update(goals)
        .set({ status: 'archived' })
        .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.userId)))
        .returning()
      return goal
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [goal] = await db
        .delete(goals)
        .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.userId)))
        .returning()
      return goal
    }),
})
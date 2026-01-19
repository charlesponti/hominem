import {
  archiveGoal,
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
} from '@hominem/services'
import { z } from 'zod'
import { protectedProcedure, router } from '../procedures'

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
      return listGoals({
        userId: ctx.userId,
        showArchived: input.showArchived,
        sortBy: input.sortBy as 'priority' | 'dueDate' | 'createdAt',
        category: input.category,
      })
    }),
  get: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ input, ctx }) => {
    return getGoal(input.id, ctx.userId)
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
      return createGoal({ ...input, userId: ctx.userId })
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
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
      return updateGoal(id, ctx.userId, data)
    }),
  archive: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ input, ctx }) => {
    return archiveGoal(input.id, ctx.userId)
  }),
  delete: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ input, ctx }) => {
    return deleteGoal(input.id, ctx.userId)
  }),
})

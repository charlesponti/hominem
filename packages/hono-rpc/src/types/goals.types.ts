import * as z from 'zod'

export const GoalStatusSchema = z.enum(['todo', 'active', 'paused', 'completed', 'archived'])
export const GoalMilestoneSchema = z.object({
  description: z.string(),
  isCompleted: z.boolean().default(false),
})

export type GoalStatus = z.infer<typeof GoalStatusSchema>
export type GoalMilestone = z.infer<typeof GoalMilestoneSchema>

export type GoalInsert = {
  title: string
  description?: string | undefined
  goalCategory?: string | undefined
  status?: GoalStatus | undefined
  priority?: number | undefined
  dateStart?: string | undefined
  dateEnd?: string | undefined
  targetValue?: number | undefined
  currentValue?: number | undefined
  unit?: string | undefined
  milestones?: GoalMilestone[] | undefined
  tags?: string[] | undefined
}

export type GoalSelect = GoalInsert & {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}

export const GoalCreateInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: GoalStatusSchema.default('todo'),
  priority: z.number().int().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  targetValue: z.number().optional(),
  unit: z.string().optional(),
  milestones: z.array(GoalMilestoneSchema).optional(),
  tags: z.array(z.string()).optional(),
})

export const GoalUpdateInputSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: GoalStatusSchema.optional(),
  priority: z.number().int().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  milestones: z.array(GoalMilestoneSchema).optional(),
})

export const GoalListQuerySchema = z.object({
  status: GoalStatusSchema.optional(),
  category: z.string().optional(),
  sortBy: z.enum(['priority', 'createdAt', 'status']).optional(),
  showArchived: z.string().optional(),
})

export type GoalCreateInput = z.infer<typeof GoalCreateInputSchema>
export type GoalUpdateInput = z.infer<typeof GoalUpdateInputSchema>
export type GoalListQuery = z.infer<typeof GoalListQuerySchema>

export type GoalStatsOutput = {
  status: string
  progress: number
  currentValue: number
  targetValue: number
  remaining: number
  milestones?: { description: string; isCompleted: boolean }[] | null
}

import type {
  createConsolidatedGoal,
  getConsolidatedGoalsByUser,
  getGoalById,
  updateConsolidatedGoal,
} from '@hominem/events-services'

export type GoalListOutput = Awaited<ReturnType<typeof getConsolidatedGoalsByUser>>
export type GoalGetOutput = NonNullable<Awaited<ReturnType<typeof getGoalById>>>
export type GoalCreateOutput = Awaited<ReturnType<typeof createConsolidatedGoal>>
export type GoalUpdateOutput = NonNullable<Awaited<ReturnType<typeof updateConsolidatedGoal>>>
export type GoalDeleteOutput = { success: true; id: string }
export type GoalArchiveOutput = GoalGetOutput
export type GoalOutput = GoalGetOutput
export type Goal = GoalOutput

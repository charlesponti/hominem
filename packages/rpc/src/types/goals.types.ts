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
  description?: string | null | undefined
  goalCategory?: string | null | undefined
  status?: GoalStatus | string | null | undefined
  priority?: number | null | undefined
  dateStart?: string | Date | null | undefined
  dateEnd?: string | Date | null | undefined
  targetValue?: number | null | undefined
  currentValue?: number | null | undefined
  unit?: string | null | undefined
  milestones?: GoalMilestone[] | null | undefined
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

export type Goal = GoalSelect & {
  type?: string | null | undefined
  date?: string | Date | null | undefined
  dateTime?: string | Date | null | undefined
  source?: string | null | undefined
  externalId?: string | null | undefined
  calendarId?: string | null | undefined
  placeId?: string | null | undefined
  visitNotes?: string | null | undefined
  visitRating?: number | null | undefined
  visitReview?: string | null | undefined
  interval?: string | null | undefined
  recurrenceRule?: string | null | undefined
  isCompleted?: boolean | null | undefined
  streakCount?: number | null | undefined
  completedInstances?: number | null | undefined
  activityType?: string | null | undefined
  duration?: number | null | undefined
  caloriesBurned?: number | null | undefined
  people?: Array<{ id: string; firstName: string; lastName: string | null }> | undefined
  tags?: Array<{ id: string; name: string; color: string | null; description: string | null }> | undefined
}

export type GoalListOutput = Goal[]
export type GoalGetOutput = Goal
export type GoalCreateOutput = Goal
export type GoalUpdateOutput = Goal
export type GoalDeleteOutput = { success: true; id: string }
export type GoalArchiveOutput = GoalGetOutput
export type GoalOutput = GoalGetOutput

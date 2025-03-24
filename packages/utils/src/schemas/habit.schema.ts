import { z } from 'zod'

export const HabitsSchema = z.object({
  routines: z.array(z.string()),
  frequency: z.array(z.string()),
  timePatterns: z.array(z.string().describe('Time patterns in the cron format')),
  triggers: z.array(z.string()).describe('Triggers for the habits'),
})

export type Habits = z.infer<typeof HabitsSchema>

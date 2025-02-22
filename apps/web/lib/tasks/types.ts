import { z } from 'zod'

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Task name is required').max(100),
  startTime: z.date(),
  duration: z.number().min(0),
  isActive: z.boolean(),
})

export type Task = z.infer<typeof TaskSchema>

export const TasksSchema = z.array(TaskSchema)

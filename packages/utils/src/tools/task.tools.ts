import { tool } from 'ai'
import { z } from 'zod'

export const create_tasks = tool({
  description: 'Create a list of tasks',
  parameters: z.object({
    tasks: z.array(z.string()).describe('List of tasks to create'),
  }),
  async execute(args: { tasks: string[] }) {
    return {
      message: `Created tasks: ${args.tasks.join(', ')}`,
    }
  },
})

export const edit_tasks = tool({
  description: 'Edit an existing task',
  parameters: z.object({
    taskId: z.string().describe('ID of the task to edit'),
    updates: z.record(z.any()).describe('Updates to apply to the task'),
  }),
  async execute(args: { taskId: string; updates: object }) {
    return {
      message: `Edited task ${args.taskId} with updates: ${JSON.stringify(args.updates)}`,
    }
  },
})

export const search_tasks = tool({
  description: 'Search for tasks',
  parameters: z.object({
    query: z.string().describe('Search query'),
  }),
  async execute(args: { query: string }) {
    return {
      message: `Searched for tasks with query: ${args.query}`,
    }
  },
})

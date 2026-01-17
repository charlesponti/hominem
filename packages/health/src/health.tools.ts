import { tool } from 'ai'
import { z } from 'zod'

export const log_health_activity = tool({
  description: 'Log a health activity',
  parameters: z.object({
    activityType: z.string().describe('Type of activity (e.g., "running", "cycling")'),
    duration: z.number().describe('Duration of activity in minutes'),
    caloriesBurned: z.number().describe('Calories burned during activity'),
    date: z.string().describe('Date of activity (YYYY-MM-DD)'),
    notes: z.string().optional().describe('Additional notes about the activity'),
  }),
  async execute(args) {
    return {
      message: `Logged ${args.activityType} activity for ${args.duration} minutes on ${args.date}`,
    }
  },
})

export const get_health_activities = tool({
  description: 'Get health activities',
  parameters: z.object({
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    activityType: z.string().optional().describe('Filter by activity type'),
  }),
  async execute(args) {
    return {
      message: `Retrieved health activities${
        args.startDate ? ` from ${args.startDate}` : ''
      }${args.endDate ? ` to ${args.endDate}` : ''}${
        args.activityType ? ` of type: ${args.activityType}` : ''
      }`,
    }
  },
})

export const update_health_activity = tool({
  description: 'Update a health activity',
  parameters: z.object({
    activityId: z.string().describe('ID of the activity to update'),
    activityType: z.string().optional().describe('New type of activity'),
    duration: z.number().optional().describe('New duration in minutes'),
    caloriesBurned: z.number().optional().describe('New calories burned'),
    notes: z.string().optional().describe('New notes'),
  }),
  async execute(args) {
    return {
      message: `Updated health activity ${args.activityId}`,
    }
  },
})

export const delete_health_activity = tool({
  description: 'Delete a health activity',
  parameters: z.object({
    activityId: z.string().describe('ID of the activity to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted health activity ${args.activityId}`,
    }
  },
})

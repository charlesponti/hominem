import * as z from 'zod';

export const TaskRecordSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  parentTaskId: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  dueAt: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
  schedulingWindowStartAt: z.string().nullable(),
  schedulingWindowEndAt: z.string().nullable(),
  scheduledStartAt: z.string().nullable(),
  scheduledEndAt: z.string().nullable(),
  timeZone: z.string().nullable(),
  location: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  artifactType: z.enum(['task', 'task_list']),
});

export const TasksVoiceOutputSchema = z.object({
  parent: TaskRecordSchema.nullable(),
  tasks: z.array(TaskRecordSchema),
});

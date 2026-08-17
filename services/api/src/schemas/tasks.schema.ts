import * as z from 'zod';

export const TaskPriority = z.enum(['low', 'medium', 'high']);

const TaskParticipantSchema = z.uuid();

const TaskTimeFields = {
  durationMinutes: z.number().int().positive().nullable().optional(),
  schedulingWindowStartAt: z.iso.datetime().nullable().optional(),
  schedulingWindowEndAt: z.iso.datetime().nullable().optional(),
  scheduledStartAt: z.iso.datetime().nullable().optional(),
  scheduledEndAt: z.iso.datetime().nullable().optional(),
  timeZone: z.string().trim().min(1).nullable().optional(),
  location: z.string().trim().min(1).max(500).nullable().optional(),
};

function validateScheduledInterval(
  input: {
    scheduledStartAt?: string | null;
    scheduledEndAt?: string | null;
  },
  context: z.RefinementCtx,
) {
  const startProvided = input.scheduledStartAt !== undefined;
  const endProvided = input.scheduledEndAt !== undefined;
  if (startProvided !== endProvided) {
    context.addIssue({
      code: 'custom',
      message: 'scheduledStartAt and scheduledEndAt must be provided together',
      path: startProvided ? ['scheduledEndAt'] : ['scheduledStartAt'],
    });
    return;
  }

  if (
    input.scheduledStartAt &&
    input.scheduledEndAt &&
    new Date(input.scheduledEndAt) <= new Date(input.scheduledStartAt)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'scheduledEndAt must be after scheduledStartAt',
      path: ['scheduledEndAt'],
    });
  }
}

export const CreateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().optional().nullable(),
    artifactType: z.enum(['task', 'task_list']),
    priority: TaskPriority.optional(),
    dueAt: z.iso.datetime().nullable().optional(),
    parentTaskId: z.uuid().nullable().optional(),
    participants: z.array(TaskParticipantSchema).max(20).optional(),
    ...TaskTimeFields,
  })
  .superRefine(validateScheduledInterval);

export const ExtractTasksInputSchema = z.object({
  transcript: z.string().min(1).max(20000),
});

export const VoiceTasksInputSchema = z.object({
  transcript: z.string().min(1).max(20000),
  referenceDate: z.iso.datetime().optional(),
  timezone: z.string().optional(),
});

export const ParseTimeBlockInputSchema = z.object({
  transcript: z.string().trim().min(1).max(20000),
  referenceDate: z.iso.datetime({ offset: true }).optional(),
  timezone: z.string().optional(),
  conversationContext: z.string().max(20000).optional(),
  calendarContext: z.string().max(20000).optional(),
});

export const CreateTaskBatchSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(2000).optional(),
      }),
    )
    .min(1)
    .max(10),
});

export const TaskParamSchema = z.object({ id: z.uuid() });

export const UpdateTaskStatusSchema = z.object({ completed: z.boolean() });

export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    priority: TaskPriority.optional(),
    dueAt: z.iso.datetime().nullable().optional(),
    participants: z.array(TaskParticipantSchema).max(20).optional(),
    ...TaskTimeFields,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .superRefine(validateScheduledInterval);

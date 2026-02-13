import {
  TaskPrioritySchema as DbTaskPrioritySchema,
  TaskStatusSchema as DbTaskStatusSchema,
} from '@hominem/db/schema/tasks';
import * as z from 'zod';

export const TaskStatusSchema = DbTaskStatusSchema.describe('TaskStatus');
export const TaskPrioritySchema = DbTaskPrioritySchema.describe('TaskPriority');

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema.default('todo'),
  priority: TaskPrioritySchema.default('medium'),
  dueDate: z.string().optional(),
});

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullish(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().optional().nullish(),
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusSchema,
});

import type { Task, TaskInsert, TaskStatus } from '@hominem/db/types/tasks';

import { db } from '@hominem/db';
import { tasks } from '@hominem/db/schema/tables';
import { and, desc, eq } from 'drizzle-orm';

import { ForbiddenError, NotFoundError, InternalError } from './errors';

export class TasksService {
  async create(data: TaskInsert): Promise<Task> {
    if (!data.userId) {
      throw new ForbiddenError('Not authorized to create task', { userId: data.userId });
    }

    const [result] = await db.insert(tasks).values(data).returning();
    if (!result) {
      throw new InternalError('Failed to create task');
    }
    return result;
  }

  async list(userId: string): Promise<Task[]> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to list tasks', { userId });
    }

    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));

    return results;
  }

  async getById(id: string, userId: string): Promise<Task> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to retrieve task', { userId });
    }

    const [item] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .limit(1);

    if (!item) {
      throw new NotFoundError('Task', { id, userId });
    }

    return item;
  }

  async update(id: string, userId: string, data: Partial<Task>): Promise<Task> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to update task', { userId });
    }

    const updateData: Partial<typeof tasks.$inferInsert> = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }

    if (Object.keys(updateData).length === 0) {
      return this.getById(id, userId);
    }

    updateData.updatedAt = new Date().toISOString();

    const [item] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Task', { id, userId });
    }

    return item;
  }

  async delete(id: string, userId: string): Promise<Task> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to delete task', { userId });
    }

    const [item] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Task', { id, userId });
    }

    return item;
  }

  async updateStatus(id: string, userId: string, status: TaskStatus): Promise<Task> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to update task status', { userId });
    }

    const [item] = await db
      .update(tasks)
      .set({
        status,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Task', { id, userId });
    }

    return item;
  }
}

export const tasksService = new TasksService();

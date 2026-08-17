import type { Selectable } from 'kysely';

import { NotFoundError } from '../../errors';
import type { DbHandle } from '../../transaction';
import type { AppTasks } from '../../types/database';

type TaskRow = Selectable<AppTasks>;

export interface TaskParticipantRecord {
  personId: string;
  displayName: string;
  email: string | null;
}

export interface TaskRecord {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  parentTaskId: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  durationMinutes: number | null;
  schedulingWindowStartAt: string | null;
  schedulingWindowEndAt: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  timeZone: string | null;
  location: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  artifactType: 'task' | 'task_list';
}

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string | null;
  artifactType: 'task' | 'task_list';
  parentTaskId?: string | null;
  priority?: string;
  dueAt?: string | null;
  durationMinutes?: number | null;
  schedulingWindowStartAt?: string | null;
  schedulingWindowEndAt?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  timeZone?: string | null;
  location?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: string;
  dueAt?: string | null;
  durationMinutes?: number | null;
  schedulingWindowStartAt?: string | null;
  schedulingWindowEndAt?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  timeZone?: string | null;
  location?: string | null;
}

export interface CreateTaskBatchInput {
  userId: string;
  parentTitle: string;
  tasks: {
    title: string;
    description?: string | null;
    priority?: string;
    dueAt?: string | null;
  }[];
}

export interface TaskBatchRecord {
  parent: TaskRecord;
  tasks: TaskRecord[];
}

export interface TaskListRecord extends TaskRecord {
  childCount: number;
}

function toTaskRecord(row: TaskRow, artifactType: 'task' | 'task_list'): TaskRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserid,
    title: row.title,
    description: row.description ?? null,
    parentTaskId: row.parentTaskId,
    status: row.status,
    priority: row.priority,
    dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
    durationMinutes: row.durationMinutes,
    schedulingWindowStartAt: row.schedulingWindowStartAt
      ? new Date(row.schedulingWindowStartAt).toISOString()
      : null,
    schedulingWindowEndAt: row.schedulingWindowEndAt
      ? new Date(row.schedulingWindowEndAt).toISOString()
      : null,
    scheduledStartAt: row.scheduledStartAt ? new Date(row.scheduledStartAt).toISOString() : null,
    scheduledEndAt: row.scheduledEndAt ? new Date(row.scheduledEndAt).toISOString() : null,
    timeZone: row.timeZone,
    location: row.location,
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
    artifactType,
  };
}

export const TaskRepository = {
  async listParticipants(
    handle: DbHandle,
    input: { taskId: string; userId: string },
  ): Promise<TaskParticipantRecord[]> {
    const rows = await handle
      .selectFrom('app.taskParticipants as participant')
      .innerJoin('app.tasks as task', 'task.id', 'participant.taskId')
      .innerJoin('app.people as person', 'person.id', 'participant.personId')
      .select([
        'participant.personId as personId',
        'person.displayName as displayName',
        (expressionBuilder) =>
          expressionBuilder
            .selectFrom('app.personContactMethods as email')
            .select('email.value')
            .whereRef('email.personId', '=', 'participant.personId')
            .where('email.kind', '=', 'email')
            .orderBy('email.isPrimary', 'desc')
            .orderBy('email.createdat', 'asc')
            .limit(1)
            .as('email'),
      ])
      .where('participant.taskId', '=', input.taskId)
      .where('task.ownerUserid', '=', input.userId)
      .orderBy('participant.createdat', 'asc')
      .execute();

    return rows.map((row) => ({
      personId: row.personId,
      displayName: row.displayName ?? 'Unknown person',
      email: row.email ?? null,
    }));
  },

  async replaceParticipants(
    handle: DbHandle,
    input: { taskId: string; userId: string; participants: string[] },
  ): Promise<TaskParticipantRecord[]> {
    const task = await TaskRepository.getOwned(handle, input.taskId, input.userId);
    if (!task) {
      throw new NotFoundError('Task', { taskId: input.taskId });
    }

    const personIds = [...new Set(input.participants)];
    const ownedPeople = await handle
      .selectFrom('app.people')
      .select('id')
      .where('ownerUserid', '=', input.userId)
      .where('id', 'in', personIds)
      .execute();
    if (ownedPeople.length !== personIds.length) {
      throw new NotFoundError('Person');
    }

    await handle.deleteFrom('app.taskParticipants').where('taskId', '=', input.taskId).execute();

    if (personIds.length > 0) {
      await handle
        .insertInto('app.taskParticipants')
        .values(personIds.map((personId) => ({ taskId: input.taskId, personId })))
        .execute();
    }

    return TaskRepository.listParticipants(handle, { taskId: input.taskId, userId: input.userId });
  },

  async create(handle: DbHandle, input: CreateTaskInput): Promise<TaskRecord> {
    const task = await handle
      .insertInto('app.tasks')
      .values({
        ownerUserid: input.userId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        parentTaskId: input.parentTaskId ?? null,
        primarySpaceId: null,
        ...(input.priority ? { priority: input.priority } : {}),
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        durationMinutes: input.durationMinutes ?? null,
        schedulingWindowStartAt: input.schedulingWindowStartAt
          ? new Date(input.schedulingWindowStartAt)
          : null,
        schedulingWindowEndAt: input.schedulingWindowEndAt
          ? new Date(input.schedulingWindowEndAt)
          : null,
        scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : null,
        scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : null,
        timeZone: input.timeZone?.trim() || null,
        location: input.location?.trim() || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toTaskRecord(task as TaskRow, input.artifactType);
  },

  /**
   * Creates a parent `task_list` row plus one child `task` row per item.
   * Callers should wrap this in `runInTransaction` so the group is atomic.
   */
  async createBatch(handle: DbHandle, input: CreateTaskBatchInput): Promise<TaskBatchRecord> {
    const parent = await TaskRepository.create(handle, {
      userId: input.userId,
      title: input.parentTitle,
      artifactType: 'task_list',
    });

    const tasks: TaskRecord[] = [];
    for (const item of input.tasks) {
      const task = await TaskRepository.create(handle, {
        userId: input.userId,
        title: item.title,
        description: item.description,
        artifactType: 'task',
        parentTaskId: parent.id,
        priority: item.priority,
        dueAt: item.dueAt,
      });
      tasks.push(task);
    }

    return { parent, tasks };
  },

  /**
   * Top-level tasks owned by the user (standalone tasks and task-list parents).
   * A row is treated as a `task_list` when it has at least one child.
   */
  async list(handle: DbHandle, input: { userId: string }): Promise<TaskListRecord[]> {
    const rows = await handle
      .selectFrom('app.tasks as t')
      .selectAll('t')
      .select((eb) =>
        eb
          .selectFrom('app.tasks as c')
          .select((ceb) => ceb.fn.countAll().as('count'))
          .whereRef('c.parentTaskId', '=', 't.id')
          .as('child_count'),
      )
      .where('t.ownerUserid', '=', input.userId)
      .where('t.parentTaskId', 'is', null)
      .orderBy('t.updatedat', 'desc')
      .execute();

    return rows.map((row) => {
      const childCount = Number(row.child_count ?? 0);
      return {
        ...toTaskRecord(row as TaskRow, childCount > 0 ? 'task_list' : 'task'),
        childCount,
      };
    });
  },

  async listChildren(
    handle: DbHandle,
    input: { parentId: string; userId: string },
  ): Promise<TaskRecord[]> {
    const rows = await handle
      .selectFrom('app.tasks')
      .selectAll()
      .where('parentTaskId', '=', input.parentId)
      .where('ownerUserid', '=', input.userId)
      .orderBy('createdat', 'asc')
      .execute();

    return (rows as TaskRow[]).map((row) => toTaskRecord(row, 'task'));
  },

  async getOwned(handle: DbHandle, id: string, userId: string): Promise<TaskRow | null> {
    const row = await handle
      .selectFrom('app.tasks')
      .selectAll()
      .where('id', '=', id)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    return (row as TaskRow | undefined) ?? null;
  },

  async load(handle: DbHandle, id: string, userId: string): Promise<TaskRecord> {
    const row = await TaskRepository.getOwned(handle, id, userId);
    if (!row) {
      throw new NotFoundError('Task', { taskId: id });
    }

    const children = await TaskRepository.listChildren(handle, { parentId: id, userId });
    return toTaskRecord(row, children.length > 0 ? 'task_list' : 'task');
  },

  async setCompleted(
    handle: DbHandle,
    id: string,
    userId: string,
    completed: boolean,
  ): Promise<TaskRecord> {
    const row = await handle
      .updateTable('app.tasks')
      .set({
        status: completed ? 'completed' : 'pending',
        completedAt: completed ? new Date() : null,
      })
      .where('id', '=', id)
      .where('ownerUserid', '=', userId)
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundError('Task', { taskId: id });
    }

    return toTaskRecord(row as TaskRow, 'task');
  },

  async update(
    handle: DbHandle,
    id: string,
    userId: string,
    patch: UpdateTaskInput,
  ): Promise<TaskRecord> {
    const row = await handle
      .updateTable('app.tasks')
      .set({
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description?.trim() || null }
          : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt ? new Date(patch.dueAt) : null } : {}),
        ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
        ...(patch.schedulingWindowStartAt !== undefined
          ? {
              schedulingWindowStartAt: patch.schedulingWindowStartAt
                ? new Date(patch.schedulingWindowStartAt)
                : null,
            }
          : {}),
        ...(patch.schedulingWindowEndAt !== undefined
          ? {
              schedulingWindowEndAt: patch.schedulingWindowEndAt
                ? new Date(patch.schedulingWindowEndAt)
                : null,
            }
          : {}),
        ...(patch.scheduledStartAt !== undefined
          ? { scheduledStartAt: patch.scheduledStartAt ? new Date(patch.scheduledStartAt) : null }
          : {}),
        ...(patch.scheduledEndAt !== undefined
          ? { scheduledEndAt: patch.scheduledEndAt ? new Date(patch.scheduledEndAt) : null }
          : {}),
        ...(patch.timeZone !== undefined ? { timeZone: patch.timeZone?.trim() || null } : {}),
        ...(patch.location !== undefined ? { location: patch.location?.trim() || null } : {}),
      })
      .where('id', '=', id)
      .where('ownerUserid', '=', userId)
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundError('Task', { taskId: id });
    }

    const children = await TaskRepository.listChildren(handle, { parentId: id, userId });
    return toTaskRecord(row as TaskRow, children.length > 0 ? 'task_list' : 'task');
  },

  async remove(handle: DbHandle, id: string, userId: string): Promise<TaskRecord> {
    const row = await TaskRepository.getOwned(handle, id, userId);
    if (!row) {
      throw new NotFoundError('Task', { taskId: id });
    }

    const children = await TaskRepository.listChildren(handle, { parentId: id, userId });
    if (children.length > 0) {
      await handle
        .deleteFrom('app.tasks')
        .where('parentTaskId', '=', id)
        .where('ownerUserid', '=', userId)
        .execute();
    }

    await handle
      .deleteFrom('app.tasks')
      .where('id', '=', id)
      .where('ownerUserid', '=', userId)
      .execute();

    return toTaskRecord(row, children.length > 0 ? 'task_list' : 'task');
  },
};

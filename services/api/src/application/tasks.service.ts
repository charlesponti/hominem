import { db } from '@hominem/db/core';
import { TaskRepository, type CreateTaskBatchInput } from '@hominem/db/tasks';
import { runInTransaction } from '@hominem/db/transaction';

export type TaskDraft = CreateTaskBatchInput['tasks'][number];

/**
 * Persist extracted task drafts: nothing for an empty set, a single `task`
 * row for exactly one draft, or a `task_list` parent plus child rows via
 * `TaskRepository.createBatch` (parent title auto-derived as `${n} tasks`).
 */
export async function persistExtractedTasks(userId: string, drafts: TaskDraft[]) {
  if (drafts.length === 0) {
    return { parent: null, tasks: [] };
  }

  if (drafts.length === 1) {
    const [draft] = drafts;
    const task = await TaskRepository.create(db, {
      artifactType: 'task',
      description: draft.description ?? null,
      title: draft.title,
      userId,
      priority: draft.priority,
      dueAt: draft.dueAt ?? null,
    });
    return { parent: null, tasks: [task] };
  }

  return runInTransaction((trx) =>
    TaskRepository.createBatch(trx, {
      userId,
      parentTitle: `${drafts.length} tasks`,
      tasks: drafts,
    }),
  );
}

import type { Task, TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from './query-keys';
import { mapTaskDetail, mapTaskList } from './task-cache';

interface TaskPatchContext {
  taskId: string;
  previousAll: TaskListItem[] | undefined;
  previousDetail: TaskDetailOutput | undefined;
  previousParentDetail: TaskDetailOutput | undefined;
}

interface UseTaskPatchMutationOptions<TVariables> {
  parentId?: string;
  mutationFn: (variables: TVariables) => Promise<Task>;
  getTaskId: (variables: TVariables) => string;
  applyOptimistic: <T extends Task>(task: T, variables: TVariables) => T;
  /**
   * update() always refreshes its own detail cache on success, in addition to
   * the parent's; complete() only refreshes one of the two. Both mutations
   * share everything else, so this flag preserves that pre-existing split
   * instead of silently changing either one's behavior.
   */
  alwaysUpdateOwnDetailOnSuccess: boolean;
}

/**
 * Shares the cancel/snapshot/optimistic-apply/rollback skeleton used by every
 * task mutation that patches a single existing task in place (update,
 * complete).
 */
export function useTaskPatchMutation<TVariables>({
  parentId,
  mutationFn,
  getTaskId,
  applyOptimistic,
  alwaysUpdateOwnDetailOnSuccess,
}: UseTaskPatchMutationOptions<TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables): Promise<TaskPatchContext> => {
      const taskId = getTaskId(variables);
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousAll = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
      const previousDetail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail(taskId));
      const previousParentDetail = parentId
        ? queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail(parentId))
        : undefined;

      queryClient.setQueryData<TaskListItem[] | undefined>(taskKeys.all, (current) =>
        mapTaskList(current, taskId, (task) => applyOptimistic(task, variables)),
      );

      queryClient.setQueryData<TaskDetailOutput | undefined>(
        taskKeys.detail(parentId ?? taskId),
        (current) => mapTaskDetail(current, taskId, (task) => applyOptimistic(task, variables)),
      );

      return { taskId, previousAll, previousDetail, previousParentDetail };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(taskKeys.all, context.previousAll);
      queryClient.setQueryData(taskKeys.detail(context.taskId), context.previousDetail);
      if (parentId) {
        queryClient.setQueryData(taskKeys.detail(parentId), context.previousParentDetail);
      }
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<TaskListItem[] | undefined>(taskKeys.all, (current) =>
        mapTaskList(current, updatedTask.id, (task) => ({ ...task, ...updatedTask })),
      );

      const applyDetail = (id: string) =>
        queryClient.setQueryData<TaskDetailOutput | undefined>(taskKeys.detail(id), (current) =>
          mapTaskDetail(current, updatedTask.id, (task) => ({ ...task, ...updatedTask })),
        );

      if (alwaysUpdateOwnDetailOnSuccess) {
        applyDetail(updatedTask.id);
        if (parentId) applyDetail(parentId);
      } else {
        applyDetail(parentId ?? updatedTask.id);
      }
    },
  });
}

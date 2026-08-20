import type { Task, TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';

export function mapTaskList(
  tasks: TaskListItem[] | undefined,
  taskId: string,
  update: (task: TaskListItem) => TaskListItem,
): TaskListItem[] | undefined {
  return tasks?.map((task) => (task.id === taskId ? update(task) : task));
}

export function mapTaskDetail(
  detail: TaskDetailOutput | undefined,
  taskId: string,
  update: (task: Task) => Task,
): TaskDetailOutput | undefined {
  if (!detail) return detail;
  if (detail.task.id === taskId) return { ...detail, task: update(detail.task) };
  return {
    ...detail,
    children: detail.children.map((child) => (child.id === taskId ? update(child) : child)),
  };
}

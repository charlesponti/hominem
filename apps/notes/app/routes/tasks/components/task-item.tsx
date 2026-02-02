import type { TaskPriority, TaskStatus } from '@hominem/db/schema/tasks';

import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import { Checkbox } from '@hominem/ui/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

import type { Task } from '~/hooks/use-tasks';

interface TaskItemProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function TaskItem({ task, onStatusChange, onDelete }: TaskItemProps) {
  const isDone = task.status === 'done';

  const handleToggle = () => {
    const newStatus: TaskStatus = isDone ? 'todo' : 'done';
    onStatusChange(task.id, newStatus);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`
        flex items-start gap-3 py-3 px-4 border-b border-slate-200 dark:border-slate-700
        hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
        ${isDone ? 'opacity-60' : ''}
      `}
    >
      <Checkbox checked={isDone} onCheckedChange={handleToggle} className="mt-1" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-medium text-sm ${isDone ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}
          >
            {task.title}
          </span>
          <Badge
            variant="secondary"
            className={`text-xs ${priorityColors[task.priority]} border-0`}
          >
            {task.priority}
          </Badge>
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{task.description}</p>
        )}

        {task.dueDate && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Due: {formatDate(task.dueDate)}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(task.id)}
        className="size-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
        title="Delete task"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

import type { Priority, TaskStatus } from '@hominem/hono-rpc/types';

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

const priorityColors: Record<Priority, string> = {
  low: 'border border-foreground/30 text-muted-foreground/60',
  medium: 'border border-foreground/50 text-muted-foreground',
  high: 'border border-secondary text-secondary-foreground',
  urgent: 'border border-destructive text-foreground',
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
        flex items-start gap-3 py-3 px-4 border-b border-border
        hover:bg-muted/50 transition-colors
        ${isDone ? 'opacity-60' : ''}
      `}
    >
      <Checkbox checked={isDone} onCheckedChange={handleToggle} className="mt-1" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-medium text-sm ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}
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
          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
        )}

        {task.dueDate && (
          <p className="text-xs text-muted-foreground mt-1">Due: {formatDate(task.dueDate)}</p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(task.id)}
        className="size-8 p-0 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title="Delete task"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

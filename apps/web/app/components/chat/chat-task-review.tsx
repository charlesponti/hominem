import type { TaskProposalItem } from '@hominem/chat/react';
import { useEffect, useState } from 'react';

import { Button } from '~/components/ui/button';

export function ChatTaskReview({
  error,
  isSaving,
  onAccept,
  onRetry,
  onReject,
  tasks,
}: {
  error?: string;
  isSaving: boolean;
  onAccept: (tasks: TaskProposalItem[]) => void;
  onRetry: () => void;
  onReject: (id: string) => void;
  tasks: TaskProposalItem[];
}) {
  const [selected, setSelected] = useState(() => new Set(tasks.map((task) => task.id)));
  const taskIdentity = tasks.map((task) => task.id).join('\0');
  useEffect(() => {
    setSelected(new Set(taskIdentity ? taskIdentity.split('\0') : []));
  }, [taskIdentity]);
  const selectedTasks = tasks.filter((task) => selected.has(task.id));

  return (
    <section
      aria-label="Review proposed tasks"
      className="mb-3 rounded-xl border border-border p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-medium">Review proposed tasks</h2>
        <span className="text-xs text-muted-foreground">{selectedTasks.length} selected</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <label className="flex gap-2 rounded-md border border-border p-2 text-sm" key={task.id}>
            <input
              checked={selected.has(task.id)}
              onChange={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (next.has(task.id)) next.delete(task.id);
                  else next.add(task.id);
                  return next;
                })
              }
              type="checkbox"
            />
            <span>
              <span className="block font-medium">{task.title}</span>
              {task.description ? (
                <span className="text-muted-foreground">{task.description}</span>
              ) : null}
            </span>
            <Button
              aria-label={`Reject ${task.title}`}
              className="ml-auto"
              onClick={(event) => {
                event.preventDefault();
                onReject(task.id);
              }}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              ×
            </Button>
          </label>
        ))}
      </div>
      {error ? (
        <div
          className="mt-3 flex items-center justify-between gap-2 text-sm text-destructive"
          role="alert"
        >
          <span>{error}</span>
          <Button onClick={onRetry} size="sm" type="button" variant="secondary">
            Retry
          </Button>
        </div>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          disabled={isSaving || selectedTasks.length === 0}
          onClick={() => onAccept(selectedTasks)}
          type="button"
        >
          {isSaving ? 'Saving…' : 'Accept selected'}
        </Button>
      </div>
    </section>
  );
}

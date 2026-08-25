import { useState } from 'react';

import { Button } from '~/components/ui/button';
import type { ProposedChatTask } from '~/hooks/use-chat-tasks';

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
  onAccept: (tasks: ProposedChatTask[]) => void;
  onRetry: () => void;
  onReject: (title: string) => void;
  tasks: ProposedChatTask[];
}) {
  const [selected, setSelected] = useState(() => new Set(tasks.map((task) => task.title)));
  const selectedTasks = tasks.filter((task) => selected.has(task.title));

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
          <label
            className="flex gap-2 rounded-md border border-border p-2 text-sm"
            key={task.title}
          >
            <input
              checked={selected.has(task.title)}
              onChange={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (next.has(task.title)) next.delete(task.title);
                  else next.add(task.title);
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
                onReject(task.title);
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

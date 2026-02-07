import type { Priority } from '@hominem/hono-rpc/types';

import { Button } from '@hominem/ui/button';
import { DatePicker } from '@hominem/ui/components/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { Textarea } from '@hominem/ui/components/ui/textarea';
import { Input } from '@hominem/ui/input';
import { RefreshCw, Plus } from 'lucide-react';
import { useState } from 'react';

import { useCreateTask } from '~/hooks/use-tasks';

interface TaskCreateFormProps {
  onSuccess?: () => void;
}

export function TaskCreateForm({ onSuccess }: TaskCreateFormProps) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const isSaving = createTask.isPending;
  const isSaveDisabled = isSaving || !title.trim();

  const handleSubmit = () => {
    setError(null);

    if (!title.trim()) return;

    createTask.mutate(
      {
        title: title.trim(),
        priority,
        ...(description.trim() && { description: description.trim() }),
        ...(dueDate && { dueDate: dueDate.toISOString() }),
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setPriority('medium');
          setDueDate(undefined);
          if (onSuccess) onSuccess();
        },
        onError: (err) => {
          setError(err instanceof Error ? err : new Error('Failed to create task'));
        },
      },
    );
  };

  return (
    <div className="w-full border border-border rounded-lg p-4 space-y-4">
      <Input
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-sm text-foreground border-border placeholder-muted-foreground"
      />

      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="text-sm text-foreground border-border placeholder-muted-foreground resize-none"
      />

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="h-9 text-sm border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
          <DatePicker value={dueDate} onSelect={setDueDate} id="task-due-date" label="" />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSaveDisabled}
          className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:bg-muted disabled:text-muted-foreground"
        >
          {isSaving ? (
            <RefreshCw className="size-4" />
          ) : (
            <>
              <Plus className="size-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="text-foreground text-sm p-3 text-center border border-muted-foreground/30 rounded-md">
          {error.message}
        </div>
      )}
    </div>
  );
}

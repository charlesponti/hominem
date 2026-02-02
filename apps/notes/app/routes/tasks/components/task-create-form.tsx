import type { TaskPriority } from '@hominem/db/schema/tasks';

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
  const [priority, setPriority] = useState<TaskPriority>('medium');
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
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
      <Input
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-sm bg-white dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500"
      />

      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="text-sm bg-white dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 resize-none"
      />

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Priority</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Due Date</label>
          <DatePicker value={dueDate} onSelect={setDueDate} id="task-due-date" label="" />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSaveDisabled}
          className="h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white transition-all disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
        >
          {isSaving ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <>
              <Plus className="size-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="text-red-500 text-sm p-3 text-center bg-red-100 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800/50">
          {error.message}
        </div>
      )}
    </div>
  );
}

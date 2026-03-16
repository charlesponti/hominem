/**
 * ContextAnchor — shows where a session originated.
 * Required in every SessionView header. Never absent.
 */

import type { SessionSource } from '@hominem/chat-services/types';

import { cn } from '~/lib/utils';

interface ContextAnchorProps {
  source: SessionSource;
  className?: string;
}

export function ContextAnchor({ source, className }: ContextAnchorProps) {
  if (source.kind === 'new') {
    return (
      <span className={cn('text-xs text-muted-foreground italic', className)}>New session</span>
    );
  }

  if (source.kind === 'thought') {
    return (
      <span
        className={cn(
          'inline-flex max-w-xs items-center gap-1.5 truncate rounded border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground',
          className,
        )}
        title={source.preview}
      >
        <span className="shrink-0 opacity-60">✦</span>
        <span className="truncate">{source.preview}</span>
      </span>
    );
  }

  // kind === 'artifact'
  const typeLabel: Record<string, string> = {
    note: 'Note',
    task: 'Task',
    task_list: 'Task List',
    tracker: 'Tracker',
  };

  return (
    <span
      className={cn(
        'inline-flex max-w-xs items-center gap-1.5 truncate rounded border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground',
        className,
      )}
      title={source.title}
    >
      <span className="shrink-0 opacity-60">{typeLabel[source.type] ?? source.type}</span>
      <span className="opacity-40">·</span>
      <span className="truncate">{source.title}</span>
    </span>
  );
}

/**
 * ContextAnchor — shows where a session originated.
 * Required in every SessionView header. Never absent.
 */

import type { SessionSource } from '@hominem/chat-services';

interface ContextAnchorProps {
  source: SessionSource;
}

export function ContextAnchor({ source }: ContextAnchorProps) {
  if (source.kind === 'new') {
    return (
      <span className="text-xs text-muted-foreground italic">New session</span>
    );
  }

  if (source.kind === 'thought') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-0.5 bg-muted max-w-xs truncate"
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
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-0.5 bg-muted max-w-xs truncate"
      title={source.title}
    >
      <span className="shrink-0 opacity-60">{typeLabel[source.type] ?? source.type}</span>
      <span className="opacity-40">·</span>
      <span className="truncate">{source.title}</span>
    </span>
  );
}

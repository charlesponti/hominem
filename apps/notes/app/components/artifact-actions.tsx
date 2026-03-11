/**
 * ArtifactActions — transformation strip shown in SessionView.
 *
 * v1: Note is enabled. Task / Task List / Tracker are disabled ("Coming soon").
 * Hidden when no messages. Dimmed during 'composing'. Disabled during
 * 'classifying', 'reviewing_changes', 'persisting'.
 */

import type { ArtifactType, ThoughtLifecycleState } from '@hominem/chat-services';
import { isArtifactTypeEnabled } from '@hominem/chat-services';

interface ArtifactActionsProps {
  state: ThoughtLifecycleState;
  messageCount: number;
  onTransform: (type: ArtifactType) => void;
}

const ACTIONS: { type: ArtifactType; label: string }[] = [
  { type: 'note', label: '→ Note' },
  { type: 'task', label: '→ Task' },
  { type: 'task_list', label: '→ Task List' },
  { type: 'tracker', label: '→ Tracker' },
];

const BLOCKING: ThoughtLifecycleState[] = ['classifying', 'reviewing_changes', 'persisting'];

export function ArtifactActions({ state, messageCount, onTransform }: ArtifactActionsProps) {
  if (messageCount === 0) return null;

  const isComposing = state === 'composing';
  const isBlocked = BLOCKING.includes(state);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 border-t border-border bg-background transition-opacity ${isComposing ? 'opacity-50' : 'opacity-100'}`}
      aria-label="Transform session into artifact"
    >
      {ACTIONS.map(({ type, label }) => {
        const enabled = isArtifactTypeEnabled(type);
        const disabled = !enabled || isBlocked;
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onTransform(type)}
            title={enabled ? undefined : 'Coming soon'}
            aria-label={enabled ? label : `${label} — Coming soon`}
            className={`
              text-xs font-mono px-3 py-1.5 rounded border transition-colors
              ${disabled
                ? 'border-border text-muted-foreground opacity-[0.38] cursor-not-allowed'
                : 'border-border text-foreground hover:bg-muted cursor-pointer'
              }
            `}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

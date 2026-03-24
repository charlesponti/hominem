import type { ArtifactType, ThoughtLifecycleState } from '@hominem/chat-services/types';
import { isArtifactTypeEnabled } from '@hominem/chat-services/types';
import { Button } from '@hominem/ui/button';

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
          <Button
            key={type}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onTransform(type)}
            title={enabled ? undefined : 'Coming soon'}
            aria-label={enabled ? label : `${label} — Coming soon`}
            className={`text-xs font-mono ${
              disabled
                ? 'border-border text-muted-foreground opacity-[0.38] cursor-not-allowed'
                : 'border-border text-foreground hover:bg-muted cursor-pointer'
            }`}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

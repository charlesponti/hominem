/**
 * ComposerActionsRow
 *
 * Renders the primary and secondary submit buttons.
 * Uses useFormStatus for pending state — must be rendered inside <form>.
 * Each button carries name="intent" value="<action>" so FormData identifies
 * which button was clicked — standard HTML multi-submit-button pattern.
 *
 * canSubmit is derived from the store slice — only re-renders when content
 * availability changes, not on every keystroke.
 */

import { ArrowUp, CirclePlus, MessageSquare } from 'lucide-react';
import { memo } from 'react';
import { useFormStatus } from 'react-dom';

import { cn } from '../../lib/utils';
import type { ComposerPresentation } from './composer-presentation';
import { useComposerSlice } from './composer-provider';

// ─── Intent mapping ───────────────────────────────────────────────────────────

function primaryIntent(posture: ComposerPresentation['posture']): string {
  switch (posture) {
    case 'reply':
      return 'send-reply';
    case 'draft':
      return 'update-note';
    default:
      return 'save-note';
  }
}

function secondaryIntent(posture: ComposerPresentation['posture']): string {
  switch (posture) {
    case 'reply':
      return 'save-as-note';
    default:
      return 'start-chat';
  }
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionButton({
  intent,
  icon,
  label,
  disabled,
  variant,
}: {
  intent: string;
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  variant: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      aria-label={label}
      title={label}
      disabled={disabled}
      data-testid={isPrimary ? 'composer-primary' : 'composer-secondary'}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-colors',
        isPrimary ? 'size-10.5' : 'size-9.5 border border-border bg-bg-surface text-foreground',
        isPrimary &&
          (disabled
            ? 'cursor-not-allowed bg-bg-surface text-text-tertiary'
            : 'bg-foreground text-background hover:bg-foreground/85'),
        !isPrimary && 'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {icon}
    </button>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export const ComposerActionsRow = memo(function ComposerActionsRow({
  presentation,
  isPending,
}: {
  presentation: ComposerPresentation;
  isPending: boolean;
}) {
  // Fine-grained slice — only re-renders when content availability changes
  const hasContent = useComposerSlice(
    (s) => s.draft.trim().length > 0 || s.uploadedFiles.length > 0,
  );
  const isUploading = useComposerSlice((s) => s.isUploading);

  // useFormStatus provides pending from the enclosing <form> action
  const { pending: formPending } = useFormStatus();

  const disabled = !hasContent || isPending || formPending || isUploading;

  return (
    <div className="flex items-center gap-2">
      <ActionButton
        intent={secondaryIntent(presentation.posture)}
        icon={
          presentation.secondaryActionIcon === 'circle-plus' ? (
            <CirclePlus className="size-4.5" />
          ) : (
            <MessageSquare className="size-4.5" />
          )
        }
        label={presentation.secondaryActionLabel}
        disabled={disabled}
        variant="secondary"
      />
      <ActionButton
        intent={primaryIntent(presentation.posture)}
        icon={
          presentation.primaryActionIcon === 'circle-plus' ? (
            <CirclePlus className="size-4.5" />
          ) : (
            <ArrowUp className="size-4.5" />
          )
        }
        label={presentation.primaryActionLabel}
        disabled={disabled}
        variant="primary"
      />
    </div>
  );
});

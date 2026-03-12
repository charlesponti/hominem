/**
 * ClassificationReview — web dialog shown when state enters 'reviewing_changes'.
 *
 * The user accepts (persist) or rejects (idle). No backdrop-dismiss.
 */

import type { ClassificationReviewProps } from '@hominem/chat-services';
import { Inline, Stack } from '@hominem/ui';
import { Button } from '@hominem/ui/button';

export function ClassificationReview({
  proposedType,
  proposedTitle,
  proposedChanges,
  previewContent,
  onAccept,
  onReject,
}: ClassificationReviewProps) {
  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 w-full h-full m-0 p-0 border-0 max-w-none max-h-none"
    >
      <div
        className="void-anim-enter-bottom w-full sm:w-[480px] bg-background border border-border rounded-t-xl sm:rounded-xl p-6 flex flex-col gap-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-title"
      >
        {/* Header */}
        <Stack gap="xs">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
            Save as {proposedType.replace('_', ' ')}
          </p>
          <h2 id="cr-title" className="text-base font-medium text-foreground">
            {proposedTitle}
          </h2>
        </Stack>

        {/* Change summary */}
        {proposedChanges.length > 0 && (
          <Stack as="ul" className="text-sm text-muted-foreground" gap="xs">
            {proposedChanges.map((change: string, i: number) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 opacity-40">—</span>
                <span>{change}</span>
              </li>
            ))}
          </Stack>
        )}

        {/* Preview */}
        <div className="rounded border border-border bg-muted p-3 max-h-40 overflow-y-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {previewContent}
          </pre>
        </div>

        {/* Actions */}
        <Inline gap="sm" className="pt-1">
          <Button type="button" variant="primary" onClick={onAccept} className="flex-1">
            Save Note
          </Button>
          <Button type="button" variant="outline" onClick={onReject}>
            Discard
          </Button>
        </Inline>
      </div>
    </dialog>
  );
}

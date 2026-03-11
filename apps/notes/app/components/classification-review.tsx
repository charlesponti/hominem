/**
 * ClassificationReview — web dialog shown when state enters 'reviewing_changes'.
 *
 * The user accepts (persist) or rejects (idle). No backdrop-dismiss.
 */

import type { ClassificationReviewProps } from '@hominem/chat-services';

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 w-full h-full m-0 p-0 border-0 max-w-none max-h-none"
    >
      <div
        className="void-anim-enter-bottom w-full sm:w-[480px] bg-background border border-border rounded-t-xl sm:rounded-xl p-6 flex flex-col gap-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-title"
      >
        {/* Header */}
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
            Save as {proposedType.replace('_', ' ')}
          </p>
          <h2 id="cr-title" className="text-base font-medium text-foreground">
            {proposedTitle}
          </h2>
        </div>

        {/* Change summary */}
        {proposedChanges.length > 0 && (
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {proposedChanges.map((change: string, i: number) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 opacity-40">—</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Preview */}
        <div className="rounded border border-border bg-muted p-3 max-h-40 overflow-y-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {previewContent}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 text-sm font-medium bg-foreground text-background rounded px-4 py-2.5 hover:opacity-90 transition-opacity"
          >
            Save Note
          </button>
          <button
            type="button"
            onClick={onReject}
            className="px-4 py-2.5 text-sm text-muted-foreground border border-border rounded hover:bg-muted transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    </dialog>
  );
}

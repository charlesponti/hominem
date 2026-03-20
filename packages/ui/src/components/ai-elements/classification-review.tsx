import type { ClassificationReviewProps } from '@hominem/chat-services/types'
import { Inline, Stack } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@hominem/ui/dialog'

export function ClassificationReview({
  proposedType,
  proposedTitle,
  proposedChanges,
  previewContent,
  onAccept,
  onReject,
}: ClassificationReviewProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onReject()}>
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 max-w-xl translate-x-[-50%] translate-y-0 rounded-t-2xl px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-md sm:pb-6"
      >
        <Stack gap="xs">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
            Save as {proposedType.replace('_', ' ')}
          </p>
          <DialogTitle id="cr-title" className="text-base font-medium text-foreground">
            {proposedTitle}
          </DialogTitle>
        </Stack>

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

        <div className="rounded border border-border bg-muted p-3 max-h-40 overflow-y-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {previewContent}
          </pre>
        </div>

        <Inline gap="sm" className="pt-1">
          <Button type="button" variant="primary" onClick={onAccept} className="flex-1">
            Save Note
          </Button>
          <Button type="button" variant="outline" onClick={onReject}>
            Discard
          </Button>
        </Inline>
      </DialogContent>
    </Dialog>
  )
}

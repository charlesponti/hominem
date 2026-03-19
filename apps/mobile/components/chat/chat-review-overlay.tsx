import { ClassificationReview } from './classification-review'
import type { ChatPendingReview } from './chat-review-actions'

interface ChatReviewOverlayProps {
  pendingReview: ChatPendingReview | null
  isVisible: boolean
  onAccept: () => void
  onReject: () => void
}

export function ChatReviewOverlay({
  pendingReview,
  isVisible,
  onAccept,
  onReject,
}: ChatReviewOverlayProps) {
  if (!isVisible || !pendingReview) {
    return null
  }

  return (
    <ClassificationReview
      proposedType={pendingReview.proposedType}
      proposedTitle={pendingReview.proposedTitle}
      proposedChanges={pendingReview.proposedChanges}
      previewContent={pendingReview.previewContent}
      onAccept={onAccept}
      onReject={onReject}
    />
  )
}

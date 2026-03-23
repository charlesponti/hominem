import type { ArtifactType } from '@hominem/chat-services/types'

import { ClassificationReview } from './classification-review.mobile'

export interface ChatPendingReview {
  proposedType: ArtifactType
  proposedTitle: string
  proposedChanges: string[]
  previewContent: string
}

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
      onAccept={onAccept}
      onReject={onReject}
      previewContent={pendingReview.previewContent}
      proposedChanges={pendingReview.proposedChanges}
      proposedTitle={pendingReview.proposedTitle}
      proposedType={pendingReview.proposedType}
    />
  )
}

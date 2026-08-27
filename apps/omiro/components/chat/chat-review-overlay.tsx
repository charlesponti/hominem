import type { ArtifactType } from '@hominem/rpc/types';

import { ClassificationReview } from './classification-review';

interface ChatPendingReview {
  proposedType: ArtifactType;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
  items?: { title: string; description?: string }[];
}

interface ChatReviewOverlayProps {
  pendingReview: ChatPendingReview | null;
  isVisible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function ChatReviewOverlay({
  pendingReview,
  isVisible,
  onAccept,
  onReject,
}: ChatReviewOverlayProps) {
  if (!isVisible || !pendingReview) {
    return null;
  }

  return (
    <ClassificationReview
      items={pendingReview.items}
      onAccept={onAccept}
      onReject={onReject}
      previewContent={pendingReview.previewContent}
      proposedChanges={pendingReview.proposedChanges}
      proposedTitle={pendingReview.proposedTitle}
      proposedType={pendingReview.proposedType}
    />
  );
}

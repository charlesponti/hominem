/**
 * ProposalCard — shows a pending AI artifact proposal on HomeView.
 * Renders when reviewQueue.length > 0 between sessions and artifacts.
 *
 * "Review →" opens ClassificationReview.
 * "Reject" dismisses the proposal (with confirmation).
 *
 * NOTE: The /api/review endpoint does not exist yet. This component is
 * ready to wire once the classification API ships.
 */

import type { ReviewItem } from '@hominem/chat-services';
import { Inline, Stack } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { FileText } from 'lucide-react';

interface ProposalCardProps {
  item: ReviewItem;
  onReview: (item: ReviewItem) => void;
  onReject: (item: ReviewItem) => void;
}

const TYPE_LABEL: Record<string, string> = {
  note: 'Note',
  task: 'Task',
  task_list: 'Task List',
  tracker: 'Tracker',
};

export function ProposalCard({ item, onReview, onReject }: ProposalCardProps) {
  return (
    <Inline
      align="start"
      className="void-anim-enter gap-3 px-3 py-3 border border-border rounded bg-muted"
    >
      <FileText className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <Inline gap="sm" className="mb-0.5">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {TYPE_LABEL[item.proposedType] ?? item.proposedType}
          </span>
        </Inline>
        <p className="text-sm text-foreground truncate">{item.proposedTitle}</p>
      </div>

      <Inline gap="sm" className="shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onReview(item)}
          className="text-xs"
        >
          Review →
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onReject(item)}
          className="px-2 text-xs text-muted-foreground"
          aria-label="Reject proposal"
        >
          ✕
        </Button>
      </Inline>
    </Inline>
  );
}

/** Renders the full review queue section. Hides entirely when empty. */
export function ProposalList({
  items,
  onReview,
  onReject,
}: {
  items: ReviewItem[];
  onReview: (item: ReviewItem) => void;
  onReject: (item: ReviewItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <Stack as="section" gap="sm" aria-labelledby="review-heading">
      <h2
        id="review-heading"
        className="text-xs font-mono text-muted-foreground uppercase tracking-wider"
      >
        Needs Review
      </h2>
      <Stack as="ul" gap="sm">
        {items.map((item) => (
          <li key={item.id}>
            <ProposalCard item={item} onReview={onReview} onReject={onReject} />
          </li>
        ))}
      </Stack>
    </Stack>
  );
}

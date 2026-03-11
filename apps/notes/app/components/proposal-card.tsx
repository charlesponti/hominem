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
    <div className="void-anim-enter flex items-start gap-3 px-3 py-3 border border-border rounded bg-muted">
      <FileText className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {TYPE_LABEL[item.proposedType] ?? item.proposedType}
          </span>
        </div>
        <p className="text-sm text-foreground truncate">{item.proposedTitle}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onReview(item)}
          className="text-xs font-mono text-foreground border border-border rounded px-2.5 py-1 hover:bg-background transition-colors"
        >
          Review →
        </button>
        <button
          type="button"
          onClick={() => onReject(item)}
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Reject proposal"
        >
          ✕
        </button>
      </div>
    </div>
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
    <section aria-labelledby="review-heading">
      <h2
        id="review-heading"
        className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3"
      >
        Needs Review
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <ProposalCard item={item} onReview={onReview} onReject={onReject} />
          </li>
        ))}
      </ul>
    </section>
  );
}

import { Star } from 'lucide-react';

interface PriorityBadgeProps {
  priority: number;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1 ${
        priority > 3
          ? 'text-foreground'
          : priority === 3
            ? 'text-muted-foreground'
            : 'text-muted-foreground/60'
      }`}
    >
      <Star size={14} />
      <span className="text-xs">{priority}</span>
    </div>
  );
}

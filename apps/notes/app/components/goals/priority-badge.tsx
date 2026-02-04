import { Star } from 'lucide-react';

interface PriorityBadgeProps {
  priority: number;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1 ${
        priority > 3 ? 'text-destructive' : priority === 3 ? 'yellow-600' : 'text-green-600'
      }`}
    >
      <Star size={14} />
      <span className="text-xs">{priority}</span>
    </div>
  );
}

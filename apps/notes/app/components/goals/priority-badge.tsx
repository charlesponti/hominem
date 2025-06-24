import { Star } from 'lucide-react'

interface PriorityBadgeProps {
  priority: number
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1 ${
        priority > 3 ? 'text-red-600' : priority === 3 ? 'text-yellow-600' : 'text-green-600'
      }`}
    >
      <Star className="w-4 h-4" />
      <span className="text-xs">{priority}</span>
    </div>
  )
}

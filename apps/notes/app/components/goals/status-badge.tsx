import type { GoalStatus } from '@hominem/utils/types'

interface StatusBadgeProps {
  status: GoalStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded ${
        status === 'completed'
          ? 'bg-green-50 text-green-700'
          : status === 'in_progress'
            ? 'bg-blue-50 text-blue-700'
            : status === 'archived'
              ? 'bg-gray-50 text-gray-700'
              : 'bg-yellow-50 text-yellow-700'
      }`}
    >
      {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  )
}

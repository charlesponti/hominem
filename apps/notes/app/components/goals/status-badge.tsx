import type { GoalStatus } from '@hominem/utils/types'

interface StatusBadgeProps {
  status: string | GoalStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  // Cast the status to GoalStatus since we know it should be one of the valid values
  const goalStatus = status as GoalStatus
  
  return (
    <span
      className={`px-2 py-1 rounded ${
        goalStatus === 'completed'
          ? 'bg-green-50 text-green-700'
          : goalStatus === 'in_progress'
            ? 'bg-blue-50 text-blue-700'
            : goalStatus === 'archived'
              ? 'bg-gray-50 text-gray-700'
              : 'bg-yellow-50 text-yellow-700'
      }`}
    >
      {goalStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  )
}

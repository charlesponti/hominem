import type { GoalStatus } from '@hominem/data/types'

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
          ? 'bg-accent text-accent-foreground'
          : goalStatus === 'in_progress'
            ? 'bg-secondary text-secondary-foreground'
            : goalStatus === 'archived'
              ? 'bg-muted text-muted-foreground'
              : 'bg-accent text-accent-foreground'
      }`}
    >
      {goalStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  )
}

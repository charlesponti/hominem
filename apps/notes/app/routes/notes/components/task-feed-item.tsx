import type { Note } from '@hominem/services/types'
import { Button } from '@hominem/ui/button'
import { Badge } from '@hominem/ui/components/ui/badge'
import { format } from 'date-fns'
import {
  CalendarDays,
  CheckCircle2,
  Edit,
  PauseCircle,
  PlayCircle,
  Target,
  Trash2,
} from 'lucide-react'
import { useTimeTracking } from '~/hooks/use-time-tracking'
import { cn } from '~/lib/utils'
import { ElapsedTime } from './elapsed-time'

type TaskFeedItemProps = {
  task: Note
  onDelete: (taskId: string) => void
  onEdit: (task: Note) => void
  className?: string
}

export function TaskFeedItem({ task, onDelete, onEdit, className = '' }: TaskFeedItemProps) {
  const {
    startTimer,
    pauseTimer,
    stopTimer,
    setTaskToTodoAndResetTime,
    resetTimerForInProgressTask,
    isLoading,
  } = useTimeTracking({
    task,
  })

  const { title, content: taskContent } = task
  const { status, priority, dueDate } = task.taskMetadata || {}
  const currentDuration = task.taskMetadata?.duration || 0

  // fallback for completed (legacy or derived)
  const completed =
    task.taskMetadata && 'completed' in task.taskMetadata
      ? Boolean(task.taskMetadata.completed)
      : status === 'done'

  const isRunning = status === 'in-progress'

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'high':
        return 'bg-orange-500'
      case 'urgent':
        return 'bg-red-500'
      default:
        return 'bg-slate-500'
    }
  }

  const _getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'from-slate-500 to-slate-600'
      case 'in-progress':
        return 'from-yellow-500 to-orange-500'
      case 'done':
        return 'from-green-500 to-emerald-600'
      default:
        return 'from-slate-500 to-slate-600'
    }
  }

  return (
    <div
      className={cn(
        'border-b border-slate-200 dark:border-slate-700 py-4 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 group',
        className
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-slate-300 dark:border-slate-600 shrink-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => {
                if (status === 'done') {
                  setTaskToTodoAndResetTime()
                } else {
                  stopTimer()
                }
              }}
              disabled={isLoading}
            >
              {completed ? (
                <CheckCircle2 className="size-4 text-green-500 dark:text-green-400" />
              ) : (
                <div className="size-4 rounded-full border-2 border-slate-400 dark:border-slate-500" />
              )}
            </Button>
            <h3
              className={cn(
                'font-semibold text-base text-slate-900 dark:text-slate-100',
                completed && 'line-through text-slate-500 dark:text-slate-400'
              )}
            >
              {title}
            </h3>
            {priority && <div className={cn('w-2 h-2 rounded-full', getPriorityColor(priority))} />}
          </div>
          {dueDate && (
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <CalendarDays className="size-3" />
              <span>Due {format(new Date(dueDate), 'MMM d')}</span>
            </div>
          )}
        </div>

        {/* Task content */}
        {taskContent && taskContent !== title && (
          <div>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed line-clamp-6">
              {taskContent}
            </p>
          </div>
        )}

        {/* Status and priority badges */}
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              'font-medium px-2 py-0.5 rounded-full text-xs text-white border-0',
              status === 'todo' && 'bg-slate-500',
              status === 'in-progress' && 'bg-yellow-500',
              status === 'done' && 'bg-green-500',
              status === 'archived' && 'bg-slate-400'
            )}
          >
            {status}
            <ElapsedTime
              startTimeIso={task.taskMetadata?.startTime}
              status={status}
              initialDurationMs={task.taskMetadata?.duration}
            />
          </Badge>
          {priority && (
            <Badge variant="outline" className="text-xs font-medium">
              {priority}
            </Badge>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-1">
            {/* Timer controls */}
            {status === 'todo' && currentDuration === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:hover:bg-yellow-900/30"
                onClick={startTimer}
                disabled={isLoading}
                title="Start task"
              >
                <PlayCircle className="size-4" />
              </Button>
            )}

            {status === 'todo' && currentDuration > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
                onClick={startTimer}
                disabled={isLoading}
                title="Resume task"
              >
                <PlayCircle className="size-4" />
              </Button>
            )}

            {isRunning && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                  onClick={pauseTimer}
                  disabled={isLoading}
                  title="Pause task"
                >
                  <PauseCircle className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                  onClick={resetTimerForInProgressTask}
                  disabled={isLoading}
                  title="Reset timer"
                >
                  <Target className="size-4" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              className="size-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              disabled={isLoading}
              title="Edit task"
            >
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 text-slate-600 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
              onClick={() => onDelete(task.id)}
              disabled={isLoading}
              title="Delete task"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(task.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}

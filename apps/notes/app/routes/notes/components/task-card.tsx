import type { Content } from '@hominem/utils/types'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { useTimeTracking } from '~/lib/content/use-time-tracking'
import { cn } from '~/lib/utils'

type TaskCardProps = {
  task: Content
  onToggleComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  className?: string
}

export function TaskCard({ task, onToggleComplete, onDelete, className = '' }: TaskCardProps) {
  const { startTimer, stopTimer, resetTimer, updateTimerTask, isLoading } = useTimeTracking({
    task,
  })

  // Fallback to prop if timerTask is not loaded yet
  const { title, content: taskContent } = task
  const { status, priority } = task.taskMetadata || {}

  // fallback for completed (legacy or derived)
  const completed =
    task.taskMetadata && 'completed' in task.taskMetadata
      ? Boolean(task.taskMetadata.completed)
      : status === 'done'

  return (
    <Card
      className={cn(
        'h-full flex flex-col overflow-hidden bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl border border-slate-200 dark:border-slate-700',
        className
      )}
    >
      <div className="flex flex-col flex-1 min-h-0 p-5">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-start gap-3 mb-4">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 rounded-full mt-0.5 border-slate-300 dark:border-slate-600 flex-shrink-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => onToggleComplete(task.id)}
            >
              {completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-slate-400 dark:border-slate-500" />
              )}
            </Button>
            <div className="flex-1">
              <h3
                className={cn(
                  'font-semibold text-slate-800 dark:text-slate-100 text-base',
                  completed && 'line-through text-slate-500 dark:text-slate-400'
                )}
              >
                {title}
              </h3>
              {taskContent && taskContent !== title && (
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 leading-relaxed line-clamp-5 overflow-hidden">
                  {taskContent}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant={
                status === 'todo'
                  ? 'outline'
                  : status === 'in-progress'
                    ? 'default'
                    : status === 'done'
                      ? 'secondary'
                      : 'destructive'
              }
              className={cn(
                'font-medium px-2.5 py-0.5 rounded-full text-xs',
                status === 'todo' &&
                  'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300',
                status === 'in-progress' &&
                  'bg-yellow-500/90 text-white dark:bg-yellow-600 border-0',
                status === 'done' && 'bg-green-500/90 text-white dark:bg-green-600 border-0',
                status === 'archived' && 'bg-slate-500/90 text-white dark:bg-slate-600 border-0'
              )}
            >
              {status}
            </Badge>
            <Badge
              variant={
                priority === 'low'
                  ? 'outline'
                  : priority === 'medium'
                    ? 'secondary'
                    : priority === 'high'
                      ? 'default'
                      : 'destructive'
              }
              className={cn(
                'font-medium px-2.5 py-0.5 rounded-full text-xs',
                priority === 'low' &&
                  'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300',
                priority === 'medium' && 'bg-blue-500/90 text-white dark:bg-blue-600 border-0',
                priority === 'high' && 'bg-red-500/90 text-white dark:bg-red-600 border-0',
                priority === 'urgent' && 'bg-purple-500/90 text-white dark:bg-purple-600 border-0'
              )}
            >
              {priority}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 justify-between mt-auto pt-2 w-full">
            <div className="flex gap-1">
              {/* Show contextual buttons based on task status */}
              {status === 'todo' && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 px-3 bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={startTimer}
                  disabled={isLoading}
                >
                  Start Task
                </Button>
              )}

              {status === 'in-progress' && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 px-3 bg-green-500 hover:bg-green-600 text-white"
                    onClick={stopTimer}
                    disabled={isLoading}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                    onClick={() =>
                      updateTimerTask({
                        id: task.id,
                        taskMetadata: { ...task?.taskMetadata, status: 'todo' },
                      })
                    }
                    disabled={isLoading}
                  >
                    Pause
                  </Button>
                </>
              )}

              {status === 'done' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                  onClick={resetTimer}
                  disabled={isLoading}
                >
                  Reopen
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors"
              onClick={() => onDelete(task.id)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

import type { Content, TaskMetadata } from '@hominem/utils/types'
import { useState } from 'react'
import { useDeleteContent } from './use-delete-content'
import { useUpdateContent } from './use-update-content'

/**
 * TimerTask interface represents a Content item with time tracking metadata
 */
export interface TimerTask extends Content {
  type: 'timer'
  taskMetadata: TaskMetadata
}

/**
 * Parameters for the useTimeTracking hook
 */
export interface UseTimeTrackingOptions {
  /**
   * The task object (optional, if provided will avoid querying for it)
   */
  task: Content
}

/**
 * useTimeTracking is a specialized hook for managing time-trackable content
 * It provides time tracking functionality on top of the core content operations
 */
export function useTimeTracking(options: UseTimeTrackingOptions) {
  const { task } = options
  const taskId = options.task.id
  const [timeTrackingError, setTimeTrackingError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Use the update content hook
  const { updateItem } = useUpdateContent()

  // Use the delete content hook
  const deleteItem = useDeleteContent()

  /**
   * Update an existing timer task
   */
  const updateTimerTask = (data: Partial<TimerTask> & { id: string }) => {
    try {
      setIsLoading(true)
      return updateItem.mutate(data, {
        onSettled: () => setIsLoading(false),
      })
    } catch (err) {
      setTimeTrackingError(err instanceof Error ? err : new Error('Failed to update timer task'))
      setIsLoading(false)
      throw err
    }
  }

  /**
   * Start timing for a task
   */
  const startTimer = () => {
    if (!taskId) {
      const err = new Error('Task ID is required to start timer')
      setTimeTrackingError(err)
      throw err
    }

    // Get the existing task metadata if available
    const existingMetadata = task.taskMetadata || {}

    setIsLoading(true)
    return updateItem.mutate(
      {
        id: taskId,
        taskMetadata: {
          ...existingMetadata,
          startTime: new Date().toISOString(),
          status: 'in-progress',
        },
      },
      {
        onSettled: () => setIsLoading(false),
      }
    )
  }

  /**
   * Stop timing for a task and update duration
   */
  const stopTimer = () => {
    if (!taskId) {
      const err = new Error('Task ID is required to stop timer')
      setTimeTrackingError(err)
      throw err
    }

    if (!task.taskMetadata?.startTime || task.taskMetadata.status !== 'in-progress') {
      return
    }

    const startTime = new Date(task.taskMetadata.startTime)
    const endTime = new Date()
    const elapsedMs = endTime.getTime() - startTime.getTime()

    setIsLoading(true)
    return updateItem.mutate(
      {
        id: taskId,
        taskMetadata: {
          ...task.taskMetadata,
          duration: (task.taskMetadata.duration || 0) + elapsedMs,
          status: 'done',
        },
      },
      {
        onSettled: () => setIsLoading(false),
      }
    )
  }

  /**
   * Reset timer for a task
   */
  const resetTimer = () => {
    if (!taskId) {
      const err = new Error('Task ID is required to reset timer')
      setTimeTrackingError(err)
      throw err
    }

    // Get the existing task metadata if available
    const existingMetadata = task.taskMetadata || {}

    setIsLoading(true)
    return updateItem.mutate(
      {
        id: taskId,
        taskMetadata: {
          ...existingMetadata,
          duration: 0,
          status: 'todo',
        },
      },
      {
        onSettled: () => setIsLoading(false),
      }
    )
  }

  /**
   * Get elapsed time for an active timer in the specified unit
   */
  const getElapsedTime = (
    unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' = 'milliseconds'
  ) => {
    if (
      !task?.taskMetadata ||
      task.taskMetadata.status !== 'in-progress' ||
      !task.taskMetadata.startTime
    ) {
      return 0
    }

    const startTime = new Date(task.taskMetadata.startTime)
    const now = new Date()
    const elapsedMs = now.getTime() - startTime.getTime() + (task.taskMetadata.duration || 0)

    switch (unit) {
      case 'seconds':
        return Math.floor(elapsedMs / 1000)
      case 'minutes':
        return Math.floor(elapsedMs / (1000 * 60))
      case 'hours':
        return Math.floor(elapsedMs / (1000 * 60 * 60))
      case 'milliseconds':
      default:
        return elapsedMs
    }
  }

  /**
   * Delete a timer task
   */
  const deleteTimerTask = () => {
    try {
      setIsLoading(true)
      return deleteItem.mutate(taskId, {
        onSettled: () => setIsLoading(false),
      })
    } catch (err) {
      setTimeTrackingError(err instanceof Error ? err : new Error('Failed to delete timer task'))
      setIsLoading(false)
      throw err
    }
  }

  return {
    updateTimerTask,
    deleteTimerTask,
    startTimer,
    stopTimer,
    resetTimer,
    getElapsedTime,
    isLoading: isLoading || updateItem.isLoading || deleteItem.isLoading,
    error: timeTrackingError,
    isError: !!timeTrackingError,
  }
}

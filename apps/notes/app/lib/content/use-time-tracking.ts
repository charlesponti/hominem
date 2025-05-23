import type { Content, TaskMetadata } from '@hominem/utils/types'
import { useState } from 'react'
import { useContentEngine } from './use-content-engine'

/**
 * TimerTask interface represents a Content item with time tracking metadata
 */
export interface TimerTask extends Content {
  type: 'timer'
  taskMetadata: TaskMetadata
}

/**
 * Optional parameters for filtering timer tasks
 */
export interface UseTimeTrackingOptions {
  /**
   * The ID of the timer task to manage
   */
  taskId: string
}

/**
 * useTimeTracking is a specialized hook for managing time-trackable content
 * It provides time tracking functionality on top of the core content operations
 */
export function useTimeTracking(options: UseTimeTrackingOptions) {
  const [timeTrackingError, setTimeTrackingError] = useState<Error | null>(null)

  // Only fetch the single timer task by ID
  const contentOptions = {
    querySuffix: `time-tracking-${options.taskId}`,
    id: options.taskId,
  }

  const {
    contentItems,
    updateItem,
    deleteItem,
    isLoading,
    error: contentError,
    ...rest
  } = useContentEngine(contentOptions)

  // Find the timer task by ID
  const timerTask = (contentItems.find(
    (item) => item.type === 'timer' && item.id === options.taskId && item.taskMetadata
  ) || null) as TimerTask | null

  /**
   * Update an existing timer task
   */
  const updateTimerTask = (data: Partial<TimerTask> & { id: string }) => {
    try {
      return updateItem.mutate(data)
    } catch (err) {
      setTimeTrackingError(err instanceof Error ? err : new Error('Failed to update timer task'))
      throw err
    }
  }

  /**
   * Start timing for a task
   */
  const startTimer = () => {
    if (!timerTask) {
      const err = new Error(`Timer task with ID ${options.taskId} not found`)
      setTimeTrackingError(err)
      throw err
    }
    return updateItem.mutate({
      id: options.taskId,
      taskMetadata: {
        ...timerTask.taskMetadata,
        startTime: new Date().toISOString(),
        status: 'in-progress',
      },
    })
  }

  /**
   * Stop timing for a task and update duration
   */
  const stopTimer = () => {
    if (!timerTask) {
      const err = new Error(`Timer task with ID ${options.taskId} not found`)
      setTimeTrackingError(err)
      throw err
    }
    if (!timerTask.taskMetadata.startTime || timerTask.taskMetadata.status !== 'in-progress') {
      return
    }
    const startTime = new Date(timerTask.taskMetadata.startTime)
    const endTime = new Date()
    const elapsedMs = endTime.getTime() - startTime.getTime()
    return updateItem.mutate({
      id: options.taskId,
      taskMetadata: {
        ...timerTask.taskMetadata,
        duration: (timerTask.taskMetadata.duration || 0) + elapsedMs,
        status: 'done',
      },
    })
  }

  /**
   * Reset timer for a task
   */
  const resetTimer = () => {
    if (!timerTask) {
      const err = new Error(`Timer task with ID ${options.taskId} not found`)
      setTimeTrackingError(err)
      throw err
    }
    return updateItem.mutate({
      id: options.taskId,
      taskMetadata: {
        ...timerTask.taskMetadata,
        duration: 0,
        status: 'todo',
      },
    })
  }

  /**
   * Get elapsed time for an active timer in the specified unit
   */
  const getElapsedTime = (
    unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' = 'milliseconds'
  ) => {
    if (
      !timerTask ||
      !timerTask.taskMetadata ||
      timerTask.taskMetadata.status !== 'in-progress' ||
      !timerTask.taskMetadata.startTime
    ) {
      return 0
    }
    const startTime = new Date(timerTask.taskMetadata.startTime)
    const now = new Date()
    const elapsedMs = now.getTime() - startTime.getTime() + (timerTask.taskMetadata.duration || 0)
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
      return deleteItem.mutate(options.taskId)
    } catch (err) {
      setTimeTrackingError(err instanceof Error ? err : new Error('Failed to delete timer task'))
      throw err
    }
  }

  return {
    timerTask,
    updateTimerTask,
    deleteTimerTask,
    startTimer,
    stopTimer,
    resetTimer,
    getElapsedTime,
    isLoading,
    error: timeTrackingError || contentError,
    ...rest,
    isError: !!(timeTrackingError || contentError),
  }
}

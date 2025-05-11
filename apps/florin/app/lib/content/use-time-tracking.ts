import type { Content, ContentType, TimeTracking } from '@hominem/utils/types' // Added ContentType
import { useState } from 'react'
import { useContentEngine } from './use-content-engine' // Changed to useContentEngine

/**
 * TimerTask interface represents a Content item with time tracking metadata
 */
export interface TimerTask extends Content {
  type: 'timer'
  timeTracking: TimeTracking
}

/**
 * Optional parameters for filtering timer tasks
 */
export interface UseTimeTrackingOptions {
  /**
   * Filter by active status
   */
  active?: boolean
  /**
   * Filter tasks by tag values
   */
  tags?: string[]
  /**
   * Search tasks by text
   */
  searchText?: string
}

/**
 * useTimeTracking is a specialized hook for managing time-trackable content
 * It provides time tracking functionality on top of the core content operations
 */
export function useTimeTracking(options: UseTimeTrackingOptions = {}) {
  const [timeTrackingError, setTimeTrackingError] = useState<Error | null>(null)

  // Convert timer options to content options
  const contentOptions = {
    type: 'timer' as ContentType, // Ensure type is ContentType
    tags: options.tags,
    searchText: options.searchText,
    querySuffix: `time-tracking-${options.active !== undefined ? options.active : ''}`,
  }

  const {
    items: allContent, // Changed from content to items
    createItem, // Changed from createContent to createItem
    updateItem, // Changed from updateContent to updateItem
    deleteItem, // Changed from deleteContent to deleteItem
    isLoading,
    error: contentError,
    ...rest
  } = useContentEngine(contentOptions) // Changed to useContentEngine

  // Filter and cast content to timer tasks
  const timerTasks = allContent.filter(
    (item) =>
      item.type === 'timer' &&
      item.timeTracking && // Ensure timeTracking exists
      (options.active === undefined || !!item.timeTracking.isActive === options.active)
  ) as TimerTask[]

  /**
   * Create a new timer task with provided data
   */
  const createTimerTask = (
    data: Omit<TimerTask, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'synced'>
  ) => {
    try {
      const now = new Date().toISOString()
      return createItem({
        // Changed to createItem
        ...data,
        type: 'timer',
        timeTracking: data.timeTracking || {
          duration: 0,
          isActive: false,
        },
        // Explicitly add missing properties required by Omit in useContentEngine
        // even though useContentEngine provides defaults, the call signature needs them.
        synced: false,
        createdAt: now,
        updatedAt: now,
      })
    } catch (err) {
      setTimeTrackingError(err instanceof Error ? err : new Error('Failed to create timer task'))
      throw err
    }
  }

  /**
   * Update an existing timer task
   */
  const updateTimerTask = (data: Partial<TimerTask> & { id: string }) => {
    try {
      return updateItem(data) // Changed to updateItem
    } catch (err) {
      setTimeTrackingError(err instanceof Error ? err : new Error('Failed to update timer task'))
      throw err
    }
  }

  /**
   * Start timing for a task
   */
  const startTimer = (taskId: string) => {
    const task = timerTasks.find((t) => t.id === taskId)
    if (!task) {
      const err = new Error(`Timer task with ID ${taskId} not found`)
      setTimeTrackingError(err)
      throw err
    }

    return updateItem({
      // Changed to updateItem
      id: taskId,
      timeTracking: {
        ...task.timeTracking,
        startTime: new Date().toISOString(),
        isActive: true,
      },
    })
  }

  /**
   * Stop timing for a task and update duration
   */
  const stopTimer = (taskId: string) => {
    const task = timerTasks.find((t) => t.id === taskId)
    if (!task) {
      const err = new Error(`Timer task with ID ${taskId} not found`)
      setTimeTrackingError(err)
      throw err
    }

    if (!task.timeTracking.startTime || !task.timeTracking.isActive) {
      return
    }

    const startTime = new Date(task.timeTracking.startTime)
    const endTime = new Date()
    const elapsedMs = endTime.getTime() - startTime.getTime()

    return updateItem({
      // Changed to updateItem
      id: taskId,
      timeTracking: {
        ...task.timeTracking,
        duration: (task.timeTracking.duration || 0) + elapsedMs,
        isActive: false,
      },
    })
  }

  /**
   * Reset timer for a task
   */
  const resetTimer = (taskId: string) => {
    const task = timerTasks.find((t) => t.id === taskId)
    if (!task) {
      const err = new Error(`Timer task with ID ${taskId} not found`)
      setTimeTrackingError(err)
      throw err
    }

    return updateItem({
      // Changed to updateItem
      id: taskId,
      timeTracking: {
        ...task.timeTracking,
        duration: 0,
        isActive: false,
      },
    })
  }

  /**
   * Get elapsed time for an active timer in the specified unit
   */
  const getElapsedTime = (
    taskId: string,
    unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' = 'milliseconds'
  ) => {
    const task = timerTasks.find((t) => t.id === taskId)
    if (
      !task ||
      !task.timeTracking ||
      !task.timeTracking.isActive ||
      !task.timeTracking.startTime
    ) {
      return 0
    }

    const startTime = new Date(task.timeTracking.startTime)
    const now = new Date()
    const elapsedMs = now.getTime() - startTime.getTime() + (task.timeTracking.duration || 0)

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
  const deleteTimerTask = (taskId: string) => {
    try {
      return deleteItem(taskId) // Changed to deleteItem
    } catch (err) {
      setTimeTrackingError(err instanceof Error ? err : new Error('Failed to delete timer task'))
      throw err
    }
  }

  return {
    timerTasks,
    createTimerTask,
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

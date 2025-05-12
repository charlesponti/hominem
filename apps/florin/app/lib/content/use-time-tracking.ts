import type { Content, ContentType, TaskMetadata } from '@hominem/utils/types' // Added TaskMetadata
import { useState } from 'react'
import { useContentEngine } from './use-content-engine' // Changed to useContentEngine

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
    items: allContent,
    createItem,
    updateItem,
    deleteItem,
    isLoading,
    error: contentError,
    ...rest
  } = useContentEngine(contentOptions)

  // Filter and cast content to timer tasks
  const timerTasks = allContent.filter(
    (item) =>
      item.type === 'timer' &&
      item.taskMetadata &&
      (options.active === undefined || !!item.taskMetadata.isActive === options.active)
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
        ...data,
        type: 'timer',
        taskMetadata: {
          ...data.taskMetadata,
          duration: data.taskMetadata?.duration || 0,
          isActive: data.taskMetadata?.isActive || false,
        },
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
      return updateItem(data)
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
      id: taskId,
      taskMetadata: {
        ...task.taskMetadata,
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
    if (!task.taskMetadata.startTime || !task.taskMetadata.isActive) {
      return
    }
    const startTime = new Date(task.taskMetadata.startTime)
    const endTime = new Date()
    const elapsedMs = endTime.getTime() - startTime.getTime()
    return updateItem({
      id: taskId,
      taskMetadata: {
        ...task.taskMetadata,
        duration: (task.taskMetadata.duration || 0) + elapsedMs,
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
      id: taskId,
      taskMetadata: {
        ...task.taskMetadata,
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
      !task.taskMetadata ||
      !task.taskMetadata.isActive ||
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
  const deleteTimerTask = (taskId: string) => {
    try {
      return deleteItem(taskId)
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

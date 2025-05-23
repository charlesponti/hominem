import type { Content, ContentInsert, Priority, TaskMetadata } from '@hominem/utils/types'
import type { UseMutationResult } from '@tanstack/react-query' // Explicit import
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
   * The task object
   */
  task: Content
}

const DEFAULT_PRIORITY: Priority = 'medium'

/**
 * useTimeTracking is a specialized hook for managing time-trackable content
 * It provides time tracking functionality on top of the core content operations
 */
export function useTimeTracking(options: UseTimeTrackingOptions) {
  const { task } = options
  const taskId = task.id
  const [localError, setLocalError] = useState<Error | null>(null)

  // Get the mutation function and states from useUpdateContent
  const updateContentHookResult = useUpdateContent()
  const updateContentItemMutation = updateContentHookResult.updateItem

  // useDeleteContent directly returns the mutation object
  const deleteContentItemMutation: UseMutationResult<
    { id: string },
    Error,
    string,
    { previousContent: Content[] | undefined }
  > = useDeleteContent()

  const handleMutationError = (err: unknown, defaultMessage: string) => {
    const error = err instanceof Error ? err : new Error(defaultMessage)
    setLocalError(error)
  }

  const getBaseMetadata = (): TaskMetadata => {
    const existingMeta = task.taskMetadata
    return {
      status: existingMeta?.status || 'todo',
      priority: existingMeta?.priority || DEFAULT_PRIORITY,
      dueDate: existingMeta?.dueDate === undefined ? null : existingMeta.dueDate,
      duration: existingMeta?.duration || 0,
      startTime: existingMeta?.startTime,
      firstStartTime: existingMeta?.firstStartTime, // Include firstStartTime
      endTime: existingMeta?.endTime,
    }
  }

  const createUpdatePayload = (
    metadataChanges: Partial<TaskMetadata>
  ): Partial<ContentInsert> & { id: string } => {
    return {
      id: taskId,
      taskMetadata: {
        ...getBaseMetadata(),
        ...metadataChanges,
      } as TaskMetadata, // Assert TaskMetadata after merge
    }
  }

  /**
   * Start or resume timing for a task
   */
  const startTimer = () => {
    if (!taskId) {
      setLocalError(new Error('Task ID is required to start timer'))
      return
    }
    const currentMeta = getBaseMetadata()
    if (currentMeta.status === 'in-progress') {
      console.warn('Timer is already running.')
      return
    }
    setLocalError(null)

    const updatePayload: Partial<TaskMetadata> = {
      status: 'in-progress',
      startTime: new Date().toISOString(),
      endTime: undefined, // Ensure endTime is cleared when starting/resuming
    }

    // Set firstStartTime only if it's not already set
    if (!currentMeta.firstStartTime) {
      updatePayload.firstStartTime = new Date().toISOString()
    }

    updateContentItemMutation.mutate(createUpdatePayload(updatePayload), {
      onError: (err: Error) => handleMutationError(err, 'Failed to start timer'),
    })
  }

  /**
   * Pause timing for a task
   */
  const pauseTimer = () => {
    if (!taskId) {
      setLocalError(new Error('Task ID is required to pause timer'))
      return
    }
    const currentMeta = getBaseMetadata()
    if (currentMeta.status !== 'in-progress' || !currentMeta.startTime) {
      console.warn('Timer is not running or startTime is missing, cannot pause.')
      return
    }
    setLocalError(null)
    const startTimeDate = new Date(currentMeta.startTime)
    const now = new Date()
    const elapsedMs = now.getTime() - startTimeDate.getTime()
    const newDuration = (currentMeta.duration || 0) + elapsedMs
    updateContentItemMutation.mutate(
      createUpdatePayload({
        status: 'todo', // Representing paused state
        startTime: undefined,
        duration: newDuration,
      }),
      {
        onError: (err: Error) => handleMutationError(err, 'Failed to pause timer'),
      }
    )
  }

  /**
   * Stop timing for a task and mark as done
   */
  const stopTimer = () => {
    if (!taskId) {
      setLocalError(new Error('Task ID is required to stop timer'))
      return
    }
    const currentMeta = getBaseMetadata()
    setLocalError(null)
    let finalDuration = currentMeta.duration || 0
    if (currentMeta.status === 'in-progress' && currentMeta.startTime) {
      const startTimeDate = new Date(currentMeta.startTime)
      const now = new Date()
      const elapsedMs = now.getTime() - startTimeDate.getTime()
      finalDuration += elapsedMs
    }
    updateContentItemMutation.mutate(
      createUpdatePayload({
        status: 'done',
        startTime: undefined,
        duration: finalDuration,
        endTime: new Date().toISOString(),
      }),
      {
        onError: (err: Error) => handleMutationError(err, 'Failed to stop timer'),
      }
    )
  }

  /**
   * Resets all time tracking fields and sets status to 'todo'.
   * This is typically used to revert a 'done' task or for a hard reset.
   */
  const setTaskToTodoAndResetTime = () => {
    if (!taskId) {
      setLocalError(new Error('Task ID is required to reset timer'))
      return
    }
    setLocalError(null)
    updateContentItemMutation.mutate(
      createUpdatePayload({
        status: 'todo',
        startTime: undefined,
        duration: 0,
        endTime: undefined,
        firstStartTime: undefined, // Clear firstStartTime on a full reset
      }),
      {
        onError: (err: Error) => handleMutationError(err, 'Failed to reset task to todo'),
      }
    )
  }

  /**
   * Resets the timer for an in-progress task.
   * Keeps the task 'in-progress', resets duration to 0, and updates startTime to now.
   * firstStartTime is preserved.
   */
  const resetTimerForInProgressTask = () => {
    if (!taskId) {
      setLocalError(new Error('Task ID is required to reset in-progress timer'))
      return
    }
    const currentMeta = getBaseMetadata()
    if (currentMeta.status !== 'in-progress') {
      console.warn('resetTimerForInProgressTask should only be called for in-progress tasks.')
      // Optionally, handle this more gracefully or call setTaskToTodoAndResetTime
      // For now, we'll proceed but this indicates a potential logic error in the calling component.
    }
    setLocalError(null)
    updateContentItemMutation.mutate(
      createUpdatePayload({
        // status: currentMeta.status, // Status remains 'in-progress' (preserved from getBaseMetadata)
        startTime: new Date().toISOString(), // Restart timing from now
        duration: 0, // Reset duration
        endTime: undefined, // Clear endTime
        // firstStartTime is preserved as it's not in this partial update
      }),
      {
        onError: (err: Error) => handleMutationError(err, 'Failed to reset in-progress timer'),
      }
    )
  }

  /**
   * Update an existing timer task (generic metadata update)
   */
  const updateTimerTask = (data: Partial<TimerTask> & { id: string }) => {
    if (!data.id) {
      setLocalError(new Error('Task ID is required for updateTimerTask'))
      return
    }
    setLocalError(null)
    const payload: Partial<ContentInsert> & { id: string } = { id: data.id }
    if (data.title !== undefined) payload.title = data.title
    if (data.content !== undefined) payload.content = data.content
    if (data.tags !== undefined) payload.tags = data.tags
    // ... other direct ContentInsert fields can be added here

    if (data.taskMetadata) {
      payload.taskMetadata = {
        ...getBaseMetadata(),
        ...data.taskMetadata,
      } as TaskMetadata
    }
    updateContentItemMutation.mutate(payload, {
      onError: (err: Error) => handleMutationError(err, 'Failed to update timer task'),
    })
  }

  /**
   * Delete a timer task
   */
  const deleteTimerTask = () => {
    if (!taskId) {
      setLocalError(new Error('Task ID is required to delete timer task'))
      return
    }
    setLocalError(null)
    deleteContentItemMutation.mutate(taskId, {
      onError: (err: Error) => handleMutationError(err, 'Failed to delete timer task'),
    })
  }

  return {
    startTimer,
    pauseTimer,
    stopTimer,
    setTaskToTodoAndResetTime, // Renamed
    resetTimerForInProgressTask, // New function
    updateTimerTask,
    deleteTimerTask,
    isLoading:
      updateContentItemMutation.status === 'loading' ||
      deleteContentItemMutation.status === 'loading',
    error: localError || updateContentItemMutation.error || deleteContentItemMutation.error,
    isError:
      !!localError ||
      updateContentItemMutation.status === 'error' ||
      deleteContentItemMutation.status === 'error',
    updateMutation: updateContentItemMutation,
    deleteMutation: deleteContentItemMutation,
  }
}

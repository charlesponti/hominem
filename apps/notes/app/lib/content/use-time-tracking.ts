import { useApiClient } from '@hominem/ui'
import type { Note, NoteInsert, Priority, TaskMetadata } from '@hominem/utils/types'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSupabaseAuth } from '../supabase/use-auth'

/**
 * TimerTask interface represents a Note item with time tracking metadata
 */
export interface TimerTask extends Note {
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
  task: Note
}

const DEFAULT_PRIORITY: Priority = 'medium'
const NOTES_QUERY_KEY_BASE = 'notes'

/**
 * useTimeTracking is a specialized hook for managing time-trackable notes
 * It provides time tracking functionality on top of the core notes operations
 */
export function useTimeTracking(options: UseTimeTrackingOptions) {
  const { task } = options
  const taskId = task.id
  const [localError, setLocalError] = useState<Error | null>(null)
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })
  const queryClient = useQueryClient()

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
  ): Partial<NoteInsert> & { id: string } => {
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

    // Use Notes API instead of Content API
    apiClient
      .put<Partial<NoteInsert> & { id: string }, Note>(
        `/api/notes/${taskId}`,
        createUpdatePayload(updatePayload)
      )
      .catch((err: Error) => handleMutationError(err, 'Failed to start timer'))
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

    // Use Notes API instead of Content API
    apiClient
      .put<Partial<NoteInsert> & { id: string }, Note>(
        `/api/notes/${taskId}`,
        createUpdatePayload({
          status: 'todo', // Representing paused state
          startTime: undefined,
          duration: newDuration,
        })
      )
      .catch((err: Error) => handleMutationError(err, 'Failed to pause timer'))
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

    // Use Notes API instead of Content API
    apiClient
      .put<Partial<NoteInsert> & { id: string }, Note>(
        `/api/notes/${taskId}`,
        createUpdatePayload({
          status: 'done',
          startTime: undefined,
          duration: finalDuration,
          endTime: new Date().toISOString(),
        })
      )
      .catch((err: Error) => handleMutationError(err, 'Failed to stop timer'))
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

    // Use Notes API instead of Content API
    apiClient
      .put<Partial<NoteInsert> & { id: string }, Note>(
        `/api/notes/${taskId}`,
        createUpdatePayload({
          status: 'todo',
          startTime: undefined,
          duration: 0,
          endTime: undefined,
          firstStartTime: undefined, // Clear firstStartTime on a full reset
        })
      )
      .catch((err: Error) => handleMutationError(err, 'Failed to reset task to todo'))
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
      console.warn('Task is not in-progress, cannot reset timer.')
      return
    }
    setLocalError(null)

    // Use Notes API instead of Content API
    apiClient
      .put<Partial<NoteInsert> & { id: string }, Note>(
        `/api/notes/${taskId}`,
        createUpdatePayload({
          duration: 0,
          startTime: new Date().toISOString(),
          // firstStartTime is preserved
        })
      )
      .catch((err: Error) => handleMutationError(err, 'Failed to reset in-progress timer'))
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
    const payload: Partial<NoteInsert> & { id: string } = { id: data.id }
    if (data.title !== undefined) payload.title = data.title
    if (data.content !== undefined) payload.content = data.content
    if (data.tags !== undefined) payload.tags = data.tags
    // ... other direct NoteInsert fields can be added here

    if (data.taskMetadata) {
      payload.taskMetadata = {
        ...getBaseMetadata(),
        ...data.taskMetadata,
      } as TaskMetadata
    }

    // Use Notes API instead of Content API
    apiClient
      .put<Partial<NoteInsert> & { id: string }, Note>(`/api/notes/${data.id}`, payload)
      .catch((err: Error) => handleMutationError(err, 'Failed to update timer task'))
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

    // Use Notes API instead of Content API
    apiClient
      .delete<null, void>(`/api/notes/${taskId}`)
      .then(() => {
        // Invalidate notes queries after successful deletion
        queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY_BASE] })
      })
      .catch((err: Error) => handleMutationError(err, 'Failed to delete timer task'))
  }

  return {
    startTimer,
    pauseTimer,
    stopTimer,
    setTaskToTodoAndResetTime, // Renamed
    resetTimerForInProgressTask, // New function
    updateTimerTask,
    deleteTimerTask,
    isLoading: false, // Since we're not using mutations, we don't have loading states
    error: localError,
    isError: !!localError,
  }
}

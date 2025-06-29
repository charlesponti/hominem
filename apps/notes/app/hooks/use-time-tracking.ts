import type { Note } from '@hominem/utils/types'
import { useUpdateNote } from './use-notes'

interface UseTimeTrackingOptions {
  task: Note
}

export function useTimeTracking({ task }: UseTimeTrackingOptions) {
  const updateNote = useUpdateNote()

  const startTimer = async () => {
    const now = new Date().toISOString()
    const firstStartTime = task.taskMetadata?.firstStartTime || now
    
    await updateNote.mutateAsync({
      id: task.id,
      data: {
        taskMetadata: {
          ...task.taskMetadata,
          status: 'in-progress',
          startTime: now,
          firstStartTime,
        },
      },
    })
  }

  const pauseTimer = async () => {
    if (!task.taskMetadata?.startTime) return

    const startTime = new Date(task.taskMetadata.startTime).getTime()
    const now = new Date().getTime()
    const elapsed = now - startTime
    const currentDuration = (task.taskMetadata.duration || 0) + elapsed

    await updateNote.mutateAsync({
      id: task.id,
      data: {
        taskMetadata: {
          ...task.taskMetadata,
          status: 'todo',
          endTime: new Date().toISOString(),
          duration: currentDuration,
        },
      },
    })
  }

  const stopTimer = async () => {
    if (!task.taskMetadata?.startTime) return

    const startTime = new Date(task.taskMetadata.startTime).getTime()
    const now = new Date().getTime()
    const elapsed = now - startTime
    const currentDuration = (task.taskMetadata.duration || 0) + elapsed

    await updateNote.mutateAsync({
      id: task.id,
      data: {
        taskMetadata: {
          ...task.taskMetadata,
          status: 'done',
          endTime: new Date().toISOString(),
          duration: currentDuration,
        },
      },
    })
  }

  const setTaskToTodoAndResetTime = async () => {
    await updateNote.mutateAsync({
      id: task.id,
      data: {
        taskMetadata: {
          ...task.taskMetadata,
          status: 'todo',
          startTime: undefined,
          endTime: undefined,
          duration: 0,
        },
      },
    })
  }

  const resetTimerForInProgressTask = async () => {
    await updateNote.mutateAsync({
      id: task.id,
      data: {
        taskMetadata: {
          ...task.taskMetadata,
          status: 'todo',
          startTime: undefined,
          endTime: undefined,
          duration: 0,
        },
      },
    })
  }

  return {
    startTimer,
    pauseTimer,
    stopTimer,
    setTaskToTodoAndResetTime,
    resetTimerForInProgressTask,
    isLoading: updateNote.isPending,
  }
} 

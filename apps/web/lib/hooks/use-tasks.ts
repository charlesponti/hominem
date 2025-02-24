import type { Task } from '../tasks/types'
import { useIndexedDBCollection } from './use-indexdb-collection'

export function useTasks() {
  // Get tasks collection using IndexedDB
  const {
    items,
    isLoading,
    create: createTask,
    update: updateTask,
    delete: deleteTask,
  } = useIndexedDBCollection<Task>({
    collectionKey: 'tasks',
    initialData: [],
  })

  // stopTask: update task to mark it as stopped with elapsedTime added to duration
  const stopTask = ({ taskId }: { taskId: string }) => {
    const task = items.find((task) => task.id === taskId)
    if (!task) return
    const updatedTask = {
      ...task,
      isActive: false,
      duration: (task.duration || 0) + new Date().getTime() - task.startTime.getTime(),
    }
    updateTask(updatedTask)
  }

  const resetTask = ({ taskId }: { taskId: string }) => {
    const task = items.find((task) => task.id === taskId)
    if (!task) return
    const updatedTask = {
      ...task,
      isActive: false,
      duration: 0,
    }
    updateTask(updatedTask)
  }

  const startTask = ({ taskId }: { taskId: string }) => {
    const task = items.find((task) => task.id === taskId)
    if (!task) return
    const updatedTask = {
      ...task,
      isActive: true,
      duration: 0,
      startTime: new Date(),
    }
    updateTask(updatedTask)
  }

  return {
    tasks: items,
    error: undefined, // error handling not provided by useIndexedDBCollection
    createTask,
    updateTask,
    deleteTask,
    resetTask,
    startTask,
    stopTask,
    isLoading,
  }
}

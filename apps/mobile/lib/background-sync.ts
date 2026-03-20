import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { storage } from './storage';

export const BACKGROUND_SYNC_TASK = 'background-sync';

// Must be defined at module scope — before any component registers the task.
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    storage.set('background_sync_last_run', new Date().toISOString());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync() {
  const status = await BackgroundTask.getStatusAsync();

  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (isRegistered) return;

  await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15, // minutes
  });
}

import { ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTasksList, useUpdateTaskStatus, useDeleteTask } from '~/hooks/use-tasks';

import { TaskCreateForm } from './components/task-create-form';
import { TaskItem } from './components/task-item';

export default function TasksPage() {
  const { data, isLoading, refetch } = useTasksList();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const tasks = data?.tasks || [];

  const handleStatusChange = (id: string, status: 'todo' | 'in-progress' | 'done' | 'archived') => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    deleteTask.mutate({ id });
  };

  const incompleteTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="flex flex-col h-screen w-full max-w-2xl mx-auto">
      {/* Fixed Header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-10">
        <div className="py-4 px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tasks</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            {showCreateForm ? 'Cancel' : 'New Task'}
          </button>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="px-4 py-4 space-y-6">
            {/* Create form */}
            {showCreateForm && <TaskCreateForm onSuccess={() => setShowCreateForm(false)} />}

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Loading tasks...</p>
              </div>
            )}

            {!isLoading && tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 bg-linear-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-3xl flex items-center justify-center mb-6">
                  <ClipboardList className="w-12 h-12 text-green-500 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  No tasks yet
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                  Keep track of what you need to do. Click "New Task" to get started.
                </p>
              </div>
            )}

            {!isLoading && tasks.length > 0 && (
              <>
                {/* Incomplete tasks */}
                {incompleteTasks.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        To Do ({incompleteTasks.length})
                      </h2>
                    </div>
                    {incompleteTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}

                {/* Completed tasks */}
                {completedTasks.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Completed ({completedTasks.length})
                      </h2>
                    </div>
                    {completedTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

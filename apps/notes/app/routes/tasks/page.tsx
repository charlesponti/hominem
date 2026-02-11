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
      <header className="shrink-0 border-b border-border z-10">
        <div className="py-4 px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-sm text-foreground hover:text-foreground/80 font-medium"
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
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary mb-4" />
                <p className="text-muted-foreground">Loading tasks...</p>
              </div>
            )}

            {!isLoading && tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 border border-dashed border-border  flex items-center justify-center mb-6">
                  <ClipboardList className="w-12 h-12 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No tasks yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Keep track of what you need to do. Click "New Task" to get started.
                </p>
              </div>
            )}

            {!isLoading && tasks.length > 0 && (
              <>
                {/* Incomplete tasks */}
                {incompleteTasks.length > 0 && (
                  <div className=" border border-border overflow-hidden">
                    <div className="px-4 py-2 bg-muted border-b border-border">
                      <h2 className="text-sm font-semibold text-foreground">
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
                  <div className=" border border-border overflow-hidden">
                    <div className="px-4 py-2 bg-muted border-b border-border">
                      <h2 className="text-sm font-semibold text-foreground">
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

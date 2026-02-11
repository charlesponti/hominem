import { ChatInput } from '~/components/chat/ChatInput';
import { ChatMessages } from '~/components/chat/ChatMessages';
import { TaskCreateForm } from './tasks/components/task-create-form';
import { TaskItem } from './tasks/components/task-item';
import { GoalCard } from '~/components/goals/goal-card';
import { useGoals } from '~/lib/hooks/use-goals';
import { useChatKeyboardShortcuts } from '~/lib/hooks/use-chat-keyboard-shortcuts';
import { useTasksList, useUpdateTaskStatus, useDeleteTask } from '~/hooks/use-tasks';
import { useEventsList } from '~/hooks/use-events';
import { WorkspaceNotesPanel } from '~/components/workspace/workspace-notes-panel';
import { useMemo, useRef, useState, useCallback } from 'react';
import { Link, useLoaderData, useMatches, type LoaderFunctionArgs, data } from 'react-router';

import { requireAuth } from '~/lib/guards';
import { createServerHonoClient } from '~/lib/rpc/server';

interface WorkspaceLoaderData {
  chatId: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, headers } = await requireAuth(request);
  const client = createServerHonoClient(session?.access_token);

  const listRes = await client.api.chats.$get({ query: { limit: '1' } });
  const listData = await listRes.json();
  const existingChat = Array.isArray(listData) && listData[0];

  let chatId: string | undefined = existingChat?.id;

  if (!chatId) {
    const createRes = await client.api.chats.$post({ json: { title: 'Workspace' } });
    const createData = await createRes.json();
    chatId = createData?.id;
  }

  if (!chatId) {
    throw new Error('Unable to initialize workspace chat');
  }

  return data({ chatId }, { headers });
}

export default function WorkspacePage() {
  const { chatId } = useLoaderData<WorkspaceLoaderData>();
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesComponentRef = useRef<{ showSearch: () => void }>(null);
  const matches = useMatches();
  const rootData = matches.find((match) => match.id === 'root')?.data as
    | { supabaseId: string | null }
    | undefined;
  const userId = rootData?.supabaseId || undefined;

  const { data: tasksData, isLoading: tasksLoading } = useTasksList();
  const tasks = tasksData?.tasks ?? [];

  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const { data: goalsData, isLoading: goalsLoading } = useGoals({ showArchived: 'false' });
  const goals = Array.isArray(goalsData) ? goalsData : [];

  const { data: eventsData, isLoading: eventsLoading } = useEventsList({ limit: 6 });
  const events = Array.isArray(eventsData) ? eventsData : [];

  const handleMessageStatusChange = useCallback(
    (newStatus: 'idle' | 'submitted' | 'streaming' | 'error', newError?: Error | null) => {
      setStatus(newStatus);
      setError(newError ?? null);
    },
    [],
  );

  useChatKeyboardShortcuts({
    onFocusInput: () => {
      inputRef.current?.focus();
    },
    onScrollToTop: () => {
      messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onScrollToBottom: () => {
      if (messagesRef.current) {
        messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
      }
    },
    enabled: true,
  });

  const incompleteTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'done' && task.status !== 'archived').slice(0, 3),
    [tasks],
  );

  const upcomingEvents = useMemo(() => events.slice(0, 4), [events]);

  return (
    <main className="min-h-screen px-4 pb-12 pt-20 font-mono cursor-crosshair">
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <aside className="flex flex-col gap-3 border border-border bg-card p-5 rounded-2xl shadow-none">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AI ASSISTANT</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">Command Center</h1>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background">
              <div ref={messagesRef} className="flex-1 overflow-y-auto">
                <ChatMessages
                  ref={messagesComponentRef}
                  chatId={chatId}
                  status={status}
                  error={error}
                />
              </div>
              <div className="border-t border-border p-4">
                <ChatInput
                  ref={inputRef}
                  chatId={chatId}
                  onStatusChange={handleMessageStatusChange}
                />
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="border border-border bg-card p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Notes</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">Current Thread</h2>
                </div>
                <Link className="text-xs text-primary cursor-crosshair" to="/notes">
                  ALL NOTES
                </Link>
              </div>

              <div className="mt-4">
                <WorkspaceNotesPanel chatId={chatId} {...(userId ? { userId } : {})} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-border bg-card p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Tasks</p>
                    <h3 className="text-lg font-semibold text-foreground">In Progress</h3>
                  </div>
                  <Link className="text-xs text-primary cursor-crosshair" to="/tasks">
                    FULL LIST
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {tasksLoading && <p className="text-xs text-muted-foreground">UPDATING…</p>}
                  {!tasksLoading && incompleteTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No active tasks.</p>
                  )}
                  {!tasksLoading &&
                    incompleteTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onStatusChange={(id, status) => updateTaskStatus.mutate({ id, status })}
                        onDelete={(id) => deleteTask.mutate({ id })}
                      />
                    ))}
                </div>
                <div className="mt-4">
                  <TaskCreateForm />
                </div>
              </div>

              <div className="border border-border bg-card p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Goals</p>
                    <h3 className="text-lg font-semibold text-foreground">Active Intentions</h3>
                  </div>
                  <Link className="text-xs text-primary cursor-crosshair" to="/goals">
                    VIEW
                  </Link>
                </div>
                <div className="mt-4 space-y-4">
                  {goalsLoading && <p className="text-xs text-muted-foreground">SYNCING…</p>}
                  {!goalsLoading && goals.length === 0 && (
                    <p className="text-xs text-muted-foreground">No goals configured.</p>
                  )}
                  {!goalsLoading && goals.slice(0, 2).map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onEdit={() => {}} onDelete={() => {}} />
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-border bg-card p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Events</p>
                  <h3 className="text-lg font-semibold text-foreground">Upcoming</h3>
                </div>
                <Link className="text-xs text-primary cursor-crosshair" to="/events">
                  OPEN CALENDAR
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {eventsLoading && <p className="text-xs text-muted-foreground">REFRESHING…</p>}
                {!eventsLoading && upcomingEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground">No events planned.</p>
                )}
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between border-b border-border/50 pb-2 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.date ? new Date(event.date).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

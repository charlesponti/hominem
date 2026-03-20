import type { ChatsListOutput } from '@hominem/hono-rpc/types/chat.types';
import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { Button } from '@hominem/ui/button';
import { getTimeAgo } from '@hominem/utils';
import { Clock3, MessageSquare, Sparkles } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { Link } from 'react-router';

interface NotesBrowseScreenProps {
  eyebrow: string;
  title: string;
  description: string;
  notes: Note[];
  isLoading: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  renderNote: (note: Note) => ReactNode;
  sessions?: ChatsListOutput;
}

export function NotesBrowseScreen({
  eyebrow,
  title,
  description,
  notes,
  isLoading,
  scrollRef,
  renderNote,
  sessions = [],
}: NotesBrowseScreenProps) {
  const hasAnything = sessions.length > 0 || notes.length > 0;

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-[calc(var(--composer-resting-height,72px)+2rem)] pt-8 sm:px-6">
          <header className="flex flex-col gap-5 border-b border-border/60 pb-6">
            <div className="body-4 uppercase tracking-[0.14em] text-text-tertiary">{eyebrow}</div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <h1 className="heading-1 whitespace-pre-line text-foreground">{title}</h1>
                <p className="body-2 max-w-2xl text-text-secondary">{description}</p>
              </div>

              <div className="flex gap-6 text-left lg:justify-end">
                <div className="min-w-20">
                  <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">
                    Sessions
                  </div>
                  <div className="heading-3 text-foreground">{sessions.length}</div>
                </div>
                <div className="min-w-20">
                  <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">Notes</div>
                  <div className="heading-3 text-foreground">{notes.length}</div>
                </div>
              </div>
            </div>
          </header>

          {/* capture section removed — Composer handles all capture */}

          {sessions.length > 0 ? (
            <section className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">
                Recent Conversations
              </div>
              <div className="overflow-hidden rounded-4xl border border-border/60 bg-background">
                <ul className="divide-y divide-border/50">
                  {sessions.map((chat) => (
                    <li key={chat.id}>
                      <Link
                        to={`/chat/${chat.id}`}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-bg-surface"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-bg-surface text-text-secondary">
                          <MessageSquare className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="body-1 truncate text-foreground">
                            {chat.title || 'Untitled conversation'}
                          </div>
                          <div className="body-4 mt-1 flex items-center gap-1 text-text-tertiary">
                            <Clock3 className="size-3" />
                            {getTimeAgo(chat.updatedAt)}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="shrink-0 rounded-full px-3">
                          Resume
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <section className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">Notes</div>

            {isLoading ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-4xl border border-border/60 bg-background px-6 py-10 text-center">
                <div className="body-2 text-text-secondary">Loading notes...</div>
              </div>
            ) : notes.length > 0 ? (
              <div className="overflow-hidden rounded-4xl border border-border/60 bg-background">
                <ul className="divide-y divide-border/50">
                  {notes.map((note) => renderNote(note))}
                </ul>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-4xl border border-dashed border-border/70 bg-background px-6 py-12 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-border/60 bg-bg-surface text-text-secondary">
                  <Sparkles className="size-5" />
                </div>
                <h2 className="heading-3 text-foreground">
                  {hasAnything ? 'Your note stream starts here' : 'Start with a thought'}
                </h2>
                <p className="body-2 mt-2 max-w-lg text-text-secondary">
                  {hasAnything
                    ? 'Capture something above and it will join the same stream as the rest of your notes.'
                    : 'Write one raw thought, question, or plan. Hakumi should feel like an empty page with memory, not a dashboard waiting for setup.'}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

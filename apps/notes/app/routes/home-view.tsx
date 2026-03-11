'use client';

/**
 * HomeView — canonical logged-in home surface for the Notes web app.
 * Equivalent of mobile `focus` tab.
 *
 * Regions (per home-contract.md):
 * 1. CaptureBar — mounted in layout.tsx, rendered above Outlet
 * 2. Resumable sessions — SessionCard list
 * 3. Pending review — ProposalCard list (when reviewQueue.length > 0)
 * 4. Recent artifacts — ArtifactCard list
 *
 * Empty state rules (N-009):
 * - Sessions: section header hidden when empty
 * - Review queue: section hidden entirely when empty
 * - Artifacts: single tertiary line when empty
 * - First-run (all empty): CaptureBar only — no welcome card, no onboarding
 */

import { useHonoQuery } from '@hominem/hono-client/react';
import type { ChatsListOutput } from '@hominem/hono-rpc/types/chat.types';
import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { FileText, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';

import { useNotesList } from '~/hooks/use-notes';

import type { Route } from './+types/home-view';

export async function loader({ request }: Route.LoaderArgs) {
  const { requireAuth } = await import('~/lib/guards');
  await requireAuth(request);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 3;

export default function HomeView() {
  const { data: chats } = useHonoQuery<ChatsListOutput>(
    ['chats', 'list'],
    ({ chats: c }) => c.list({ limit: MAX_SESSIONS }),
  );

  const { data: notes = [] } = useNotesList({ limit: 6 });

  const resumableSessions = (chats ?? []).filter((chat) => {
    const age = Date.now() - new Date(chat.updatedAt).getTime();
    return age <= THIRTY_DAYS_MS;
  });

  const hasAnything =
    resumableSessions.length > 0 || notes.length > 0;

  // First-run / empty: show nothing beyond CaptureBar (which is in the layout)
  if (!hasAnything) return null;

  return (
    <div className="flex flex-col gap-8 py-6">
      {/* Resumable Sessions */}
      {resumableSessions.length > 0 && (
        <section aria-labelledby="sessions-heading">
          <h2
            id="sessions-heading"
            className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3"
          >
            Sessions
          </h2>
          <ul className="flex flex-col gap-2">
            {resumableSessions.map((chat) => (
              <li key={chat.id}>
                <Link
                  to={`/chat/${chat.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 border border-border rounded hover:bg-muted transition-colors group"
                >
                  <MessageSquare className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm text-foreground truncate">
                    {chat.title || 'Untitled session'}
                  </span>
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    Resume →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent Artifacts */}
      <section aria-labelledby="artifacts-heading">
        <h2
          id="artifacts-heading"
          className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3"
        >
          Notes
        </h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your saved notes, tasks, and trackers will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note: Note) => (
              <li key={note.id}>
                <Link
                  to={`/notes/${note.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 border border-border rounded hover:bg-muted transition-colors group"
                >
                  <FileText className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm text-foreground truncate">
                    {note.title || 'Untitled note'}
                  </span>
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

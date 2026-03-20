/**
 * FocusView — the authenticated home route (/home)
 *
 * Renders a single unified InboxStream: notes and chats interleaved,
 * sorted by updatedAt DESC. No separate sections — one feed, one scroll.
 *
 * Naming aligned with mobile: FocusView (mobile) ↔ FocusView (web)
 */

import { useRef } from 'react';

import { useHonoMutation, useHonoUtils } from '@hominem/hono-client/react';
import type { ChatsDeleteOutput } from '@hominem/hono-rpc/types/chat.types';
import type { NotesDeleteOutput } from '@hominem/hono-rpc/types/notes.types';

import { InboxStream } from '~/components/inbox-stream';
import { useInboxStream } from '~/hooks/use-inbox-stream';
import { useDeleteNote } from '~/hooks/use-notes';

import type { Route } from './+types/home-view';

export async function loader({ request }: Route.LoaderArgs) {
  const { requireAuth } = await import('~/lib/guards');
  await requireAuth(request);
}

export default function FocusView() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { items, isLoading, noteCount, chatCount } = useInboxStream();

  const utils = useHonoUtils();

  // ─── Note deletion ───────────────────────────────────────────────────────
  const deleteNote = useDeleteNote();

  function handleDeleteNote(id: string) {
    deleteNote.mutate({ id });
  }

  // ─── Chat deletion ───────────────────────────────────────────────────────
  const deleteChat = useHonoMutation<ChatsDeleteOutput, { chatId: string }>(
    ({ chats }, variables) => chats.delete(variables),
    {
      onSuccess: () => utils.invalidate(['chats', 'list']),
    },
  );

  function handleDeleteChat(id: string) {
    deleteChat.mutate({ chatId: id });
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-[calc(var(--composer-resting-height,72px)+2rem)] pt-8 sm:px-6">

          {/* Header */}
          <header className="flex flex-col gap-5 border-b border-border/60 pb-6">
            <div className="body-4 uppercase tracking-[0.14em] text-text-tertiary">Focus</div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <h1 className="heading-1 whitespace-pre-line text-foreground">
                  One place for raw thoughts, working notes, and live conversations.
                </h1>
                <p className="body-2 text-text-secondary">
                  Capture quickly, resume a conversation without losing context, and let notes
                  accumulate into one stream instead of separate tools.
                </p>
              </div>

              <div className="flex gap-6 text-left lg:justify-end">
                <div className="min-w-16">
                  <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">Chats</div>
                  <div className="heading-3 text-foreground">{chatCount}</div>
                </div>
                <div className="min-w-16">
                  <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">Notes</div>
                  <div className="heading-3 text-foreground">{noteCount}</div>
                </div>
              </div>
            </div>
          </header>

          {/* Unified feed */}
          <section aria-label="Focus feed">
            <InboxStream
              items={items}
              isLoading={isLoading}
              scrollRef={scrollRef}
              onDeleteNote={handleDeleteNote}
              onDeleteChat={handleDeleteChat}
            />
          </section>

        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * CaptureBar — persistent quick-capture input for the Notes web app.
 * Mounted in the authenticated layout shell so it persists across routes.
 *
 * "Save" → classifying → ClassificationReview → persisting.
 * "Think through it" → seed a new session → navigate to chat.$chatId.
 *
 * TODO Phase 7: wire Save path to classification API.
 * TODO Phase 6: wire "Think through it" to create session with seed text.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useHonoMutation } from '@hominem/hono-client/react';
import type { ThoughtLifecycleState } from '@hominem/chat-services';

interface CaptureBarProps {
  state?: ThoughtLifecycleState;
}

export function CaptureBar({ state = 'idle' }: CaptureBarProps) {
  const [text, setText] = useState('');
  const navigate = useNavigate();

  const isBlocking = state === 'classifying' || state === 'persisting';
  const hasInput = text.trim().length > 0;

  const createChat = useHonoMutation<{ id: string }, { title: string }>(
    ({ chats }, body) => chats.create(body),
    {
      onSuccess: (chat) => {
        const seed = text;
        setText('');
        void navigate(`/chat/${chat.id}`, { state: { seedText: seed } });
      },
    },
  );

  const handleThinkThroughIt = () => {
    if (!hasInput) return;
    createChat.mutate({ title: text.trim().slice(0, 64) || 'New session' });
  };

  return (
    <div className="border-b border-border bg-background px-4 py-3">
      <div className="flex flex-col gap-2 max-w-3xl mx-auto">
        <textarea
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isBlocking}
          rows={1}
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleThinkThroughIt();
            }
          }}
          aria-label="Capture your thought"
          data-testid="capture-bar-input"
        />
        {hasInput && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleThinkThroughIt}
              disabled={isBlocking || createChat.isPending}
              className="text-xs font-mono bg-foreground text-background px-3 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              data-testid="capture-bar-think"
            >
              Think through it →
            </button>
            <button
              type="button"
              disabled={isBlocking}
              className="text-xs font-mono border border-border text-foreground px-3 py-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
              data-testid="capture-bar-save"
              // TODO Phase 7: wire → classifying → ClassificationReview → persisting
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

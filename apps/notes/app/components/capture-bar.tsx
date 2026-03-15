'use client';

/**
 * CaptureBar — persistent quick-capture input for the Notes web app.
 * Mounted in the authenticated layout shell so it persists across routes.
 *
 * "Save" → persist as note directly (no session required).
 * "Think through it" → seed a new session → navigate to chat.$chatId.
 */

import type { ThoughtLifecycleState } from '@hominem/chat-services/types';
import { useHonoMutation } from '@hominem/hono-client/react';
import { Inline, Stack } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { TextArea } from '@hominem/ui/text-area';
import { useState } from 'react';
import { useNavigate } from 'react-router';

interface CaptureBarProps {
  state?: ThoughtLifecycleState;
}

export function CaptureBar({ state = 'idle' }: CaptureBarProps) {
  const [text, setText] = useState('');
  const navigate = useNavigate();

  const isBlocking = state === 'classifying' || state === 'persisting';
  const hasInput = text.trim().length > 0;

  const createChat = useHonoMutation<{ id: string }, { seedText: string; title: string }>(
    async ({ chats }, body) => {
      const chat = await chats.create({ title: body.title });

      if (body.seedText.trim()) {
        await chats.send({
          chatId: chat.id,
          message: body.seedText,
        });
      }

      return chat;
    },
    {
      onSuccess: (chat) => {
        setText('');
        void navigate(`/chat/${chat.id}`);
      },
    },
  );

  const saveNote = useHonoMutation<{ id: string }, string>(
    async ({ notes }, content) => {
      const title = content.trim().slice(0, 64);
      return notes.create({
        content,
        ...(title ? { title } : {}),
      });
    },
    {
      onSuccess: () => {
        setText('');
      },
    },
  );

  const handleThinkThroughIt = () => {
    if (!hasInput) return;
    createChat.mutate({
      seedText: text,
      title: text.trim().slice(0, 64) || 'New session',
    });
  };

  const handleSave = () => {
    if (!hasInput) return;
    saveNote.mutate(text.trim());
  };

  const isBusy = isBlocking || createChat.isPending || saveNote.isPending;

  return (
    <div className="border-b border-border bg-background px-4 py-3">
      <Stack gap="sm" className="max-w-3xl mx-auto">
        <TextArea
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isBusy}
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
          <Inline gap="sm">
            <Button
              variant="primary"
              size="sm"
              onClick={handleThinkThroughIt}
              disabled={isBusy}
              className="text-xs font-mono"
              data-testid="capture-bar-think"
            >
              Think through it →
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isBusy}
              className="text-xs font-mono"
              data-testid="capture-bar-save"
            >
              {saveNote.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Inline>
        )}
      </Stack>
    </div>
  );
}

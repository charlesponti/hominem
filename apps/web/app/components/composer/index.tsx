import { useGSAP } from '@gsap/react';
import { useHonoMutation } from '@hominem/hono-client/react';
import { ArrowUp, Globe, Mic, Paperclip, Plus, StopCircle } from 'lucide-react';
import { useCallback, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import { ChatModals } from '~/components/chat/ChatModals';
import { useCreateNote, useUpdateNote } from '~/hooks/use-notes';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import { cn } from '~/lib/utils';

import { playEntry, playSubmitPulse } from './animations';
import { useComposer } from './composer-provider';
import { useSwipeGesture } from './mobile-gestures';

// ─── Context-aware copy ──────────────────────────────────────────────────────

const COPY = {
  generic: {
    placeholder: 'Ask anything',
    submitLabel: 'Send',
  },
  'note-aware': {
    placeholder: 'Ask about this note, or add to it...',
    submitLabel: 'Send',
  },
  'chat-continuation': {
    placeholder: 'Message',
    submitLabel: 'Send',
  },
} as const;

// ─── Composer ───────────────────────────────────────────────────────────────

export function Composer() {
  const navigate = useNavigate();
  const {
    draftText,
    setDraftText,
    clearDraft,
    mode,
    noteId,
    noteTitle,
    chatId,
    containerRef: cardRef,
    submitBtnRef,
    inputRef,
  } = useComposer();

  const [showVoice, setShowVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasInput = draftText.trim().length > 0;

  const copy = COPY[mode];

  // ─── Mutations ──────────────────────────────────────────────────────────

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const createChatMutation = useHonoMutation<{ id: string }, { seedText: string; title: string }>(
    async ({ chats }, body) => {
      const chat = await chats.create({ title: body.title });
      if (body.seedText.trim()) {
        await chats.send({ chatId: chat.id, message: body.seedText });
      }
      return chat;
    },
  );

  const sendMessage = useSendMessage({ chatId: chatId ?? '' });

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    containerRef: cardRef,
    isExpanded,
    setIsExpanded,
  });

  // ─── GSAP entry ────────────────────────────────────────────────────────

  useGSAP(
    () => {
      const card = cardRef.current;
      if (!card) return;
      playEntry(card);
    },
    { scope: cardRef },
  );

  // ─── Actions ───────────────────────────────────────────────────────────

  const doSubmitPulse = useCallback(
    (then: () => void) => {
      const btn = submitBtnRef.current;
      const inp = inputRef.current;
      if (btn && inp) {
        playSubmitPulse(btn, inp, then);
      } else {
        then();
      }
    },
    [submitBtnRef, inputRef],
  );

  const handleSend = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isSubmitting) return;
    setIsSubmitting(true);

    if (mode === 'chat-continuation' && chatId) {
      doSubmitPulse(async () => {
        try {
          await sendMessage.mutateAsync({ message: text, chatId });
          clearDraft();
        } finally {
          setIsSubmitting(false);
        }
      });
    } else if (mode === 'note-aware' && noteId) {
      const contextMsg = noteTitle ? `[Regarding note: "${noteTitle}"]\n\n${text}` : text;
      doSubmitPulse(async () => {
        try {
          const chat = await createChatMutation.mutateAsync({
            seedText: contextMsg,
            title: text.slice(0, 64) || 'Note chat',
          });
          clearDraft();
          void navigate(`/chat/${chat.id}`);
        } finally {
          setIsSubmitting(false);
        }
      });
    } else {
      doSubmitPulse(async () => {
        try {
          const chat = await createChatMutation.mutateAsync({
            seedText: text,
            title: text.slice(0, 64) || 'New session',
          });
          clearDraft();
          void navigate(`/chat/${chat.id}`);
        } finally {
          setIsSubmitting(false);
        }
      });
    }
  }, [
    draftText,
    isSubmitting,
    mode,
    chatId,
    noteId,
    noteTitle,
    doSubmitPulse,
    sendMessage,
    createChatMutation,
    clearDraft,
    navigate,
  ]);

  const handleSaveNote = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isSubmitting) return;
    setIsSubmitting(true);

    if (mode === 'note-aware' && noteId) {
      doSubmitPulse(async () => {
        try {
          await updateNote.mutateAsync({ id: noteId, content: text });
          clearDraft();
        } finally {
          setIsSubmitting(false);
        }
      });
    } else {
      doSubmitPulse(async () => {
        try {
          const title = text.slice(0, 64);
          await createNote.mutateAsync({
            content: text,
            ...(title ? { title } : {}),
          });
          clearDraft();
        } finally {
          setIsSubmitting(false);
        }
      });
    }
  }, [draftText, isSubmitting, mode, noteId, doSubmitPulse, updateNote, createNote, clearDraft]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const handleAudioTranscribed = useCallback(
    (transcript: string) => {
      setDraftText(transcript);
      setShowVoice(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [setDraftText, inputRef],
  );

  return (
    <>
      {/* Outer positioning wrapper — fixed, centered, never touched by GSAP */}
      <div
        className={cn(
          'fixed bottom-0 left-1/2 z-50 -translate-x-1/2',
          'w-full max-w-[780px]',
          'px-4 sm:px-6',
          'pb-[calc(env(safe-area-inset-bottom)+16px)]',
          'pointer-events-none',
        )}
      >
        {/* Card — GSAP entry target, always fully open */}
        <div
          ref={cardRef}
          className={cn(
            'w-full pointer-events-auto',
            'rounded-[1.75rem]',
            'bg-background',
            'border border-border/80',
            'shadow-[0_2px_20px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]',
          )}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Context strip — only when in a note or chat context */}
          {(mode === 'note-aware' || mode === 'chat-continuation') && (
            <div className="flex items-center gap-2 px-4 pt-3 pb-0">
              <span className="text-xs text-text-tertiary truncate">
                {mode === 'note-aware' && noteTitle
                  ? noteTitle
                  : mode === 'chat-continuation'
                    ? 'Continuing conversation'
                    : null}
              </span>
            </div>
          )}

          {/* Textarea region */}
          <div className="px-4 pt-3 pb-2">
            <textarea
              ref={inputRef}
              data-testid="composer-input"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={copy.placeholder}
              rows={1}
              disabled={isSubmitting}
              className={cn(
                'w-full resize-none bg-transparent',
                'text-[16px] leading-relaxed text-foreground',
                'placeholder:text-text-tertiary',
                'border-0 p-0 outline-none focus:outline-none',
                'min-h-[28px] max-h-40 overflow-y-auto',
                'field-sizing-content',
              )}
              aria-label="Compose message or note"
            />
          </div>

          {/* Bottom tool strip */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            {/* Left tools */}
            <div className="flex items-center gap-0.5">
              <ToolButton icon={<Plus className="size-[18px]" />} label="Attach or browse" />
              <ToolButton icon={<Globe className="size-[18px]" />} label="Search the web" />
              <ToolButton icon={<Paperclip className="size-[18px]" />} label="Attach file" />
              {mode !== 'chat-continuation' && (
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5',
                    'text-[13px] font-medium text-text-secondary',
                    'border border-border/60',
                    'hover:bg-bg-surface transition-colors',
                    'ml-1',
                  )}
                  onClick={() => void handleSaveNote()}
                  disabled={!hasInput || isSubmitting}
                  title="Save as note"
                >
                  {mode === 'note-aware' ? 'Add to note' : 'Save note'}
                </button>
              )}
            </div>

            {/* Right tools */}
            <div className="flex items-center gap-2">
              {/* Mic / Stop recording */}
              <button
                type="button"
                className={cn(
                  'flex size-8 items-center justify-center rounded-full transition-colors',
                  isRecording
                    ? 'bg-destructive text-destructive-foreground'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-surface',
                )}
                onClick={() => {
                  if (isRecording) {
                    setIsRecording(false);
                  } else {
                    setShowVoice(true);
                  }
                }}
                aria-label={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? (
                  <StopCircle className="size-[18px]" />
                ) : (
                  <Mic className="size-[18px]" />
                )}
              </button>

              {/* Send button */}
              <button
                ref={submitBtnRef}
                type="button"
                data-testid="composer-primary"
                onClick={() => void handleSend()}
                disabled={!hasInput || isSubmitting}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full transition-colors',
                  hasInput
                    ? 'bg-foreground text-background hover:bg-foreground/80'
                    : 'bg-bg-surface text-text-tertiary cursor-not-allowed',
                )}
                aria-label={copy.submitLabel}
              >
                <ArrowUp className="size-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice modal */}
      <ChatModals
        showAudioRecorder={showVoice}
        onCloseAudioRecorder={() => setShowVoice(false)}
        onAudioTranscribed={handleAudioTranscribed}
      />
    </>
  );
}

// ─── ToolButton ──────────────────────────────────────────────────────────────

function ToolButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-full',
        'text-text-tertiary hover:text-text-secondary hover:bg-bg-surface',
        'transition-colors',
      )}
    >
      {icon}
    </button>
  );
}

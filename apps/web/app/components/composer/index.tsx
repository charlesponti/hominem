/**
 * Composer (HyperForm)
 *
 * Context-aware capture input, always fixed at the bottom of the viewport.
 * Mode is derived from the current route via useComposerMode — no route
 * needs to imperatively push context.
 *
 * Mode behaviour (Phase 1 — committed-on-send):
 *
 *   generic (home)        Note/Chat pill toggle → send commits the chosen intent
 *   chat-continuation     Send button always sends to the current chat
 *   note-aware            "Add to note" or "Ask about note" toggle → send commits
 */

import { useGSAP } from '@gsap/react';
import { useHonoMutation } from '@hominem/hono-client/react';
import gsap from 'gsap';
import { ArrowUp, FileText, MessageSquare, Mic, Paperclip, Plus, StopCircle } from 'lucide-react';
import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import { ChatModals } from '~/components/chat/ChatModals';
import { useCreateNote, useUpdateNote } from '~/hooks/use-notes';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import { cn } from '~/lib/utils';

import { playEntry, playSubmitPulse } from './animations';
import { type DefaultIntent, useComposer } from './composer-provider';
import { useComposerMode } from './use-composer-mode';
import { useSwipeGesture } from './mobile-gestures';

// ─── Copy ─────────────────────────────────────────────────────────────────────

const PLACEHOLDER: Record<string, string> = {
  generic_note: 'Capture a thought…',
  generic_chat: 'Ask anything…',
  'note-aware': 'Add to this note, or ask about it…',
  'chat-continuation': 'Message',
};

// ─── Intent toggle ────────────────────────────────────────────────────────────

function IntentToggle({
  intent,
  onChange,
}: {
  intent: DefaultIntent;
  onChange: (intent: DefaultIntent) => void;
}) {
  const toggleRef = useRef<HTMLDivElement>(null);

  function handleChange(next: DefaultIntent) {
    if (next === intent) return;
    if (toggleRef.current) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        gsap.fromTo(toggleRef.current, { opacity: 0.6 }, { opacity: 1, duration: 0.16, ease: 'power1.inOut' });
      }
    }
    onChange(next);
  }

  return (
    <div
      ref={toggleRef}
      className="flex items-center gap-0.5 rounded-full border border-border/60 bg-bg-surface p-0.5"
      role="group"
      aria-label="Choose intent"
    >
      {(['note', 'chat'] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => handleChange(opt)}
          aria-pressed={intent === opt}
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
            intent === opt
              ? 'bg-background text-foreground shadow-sm'
              : 'text-text-tertiary hover:text-text-secondary',
          )}
        >
          {opt === 'note' ? <FileText className="size-3" /> : <MessageSquare className="size-3" />}
          {opt === 'note' ? 'Note' : 'Chat'}
        </button>
      ))}
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

export function Composer() {
  const navigate = useNavigate();

  const {
    draftText,
    setDraftText,
    clearDraft,
    noteTitle,
    defaultIntent,
    setDefaultIntent,
    containerRef: cardRef,
    submitBtnRef,
    inputRef,
  } = useComposer();

  const { mode, noteId, chatId } = useComposerMode();

  const [showVoice, setShowVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasInput = draftText.trim().length > 0;

  // Derive placeholder from current mode + intent
  const placeholder =
    mode === 'generic'
      ? (PLACEHOLDER[`generic_${defaultIntent}`] ?? PLACEHOLDER.generic_note)
      : (PLACEHOLDER[mode] ?? 'Write something…');

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

  // ─── GSAP entry ─────────────────────────────────────────────────────────

  useGSAP(
    () => {
      const card = cardRef.current;
      if (!card) return;
      playEntry(card);
    },
    { scope: cardRef },
  );

  // ─── Submit pulse wrapper ────────────────────────────────────────────────

  const doSubmitPulse = useCallback(
    (then: () => void) => {
      const btn = submitBtnRef.current;
      const inp = inputRef.current;
      if (btn && inp) playSubmitPulse(btn, inp, then);
      else then();
    },
    [submitBtnRef, inputRef],
  );

  // ─── handleSend — commits based on mode + defaultIntent ─────────────────

  const handleSend = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isSubmitting) return;
    setIsSubmitting(true);

    // chat-continuation: always send to current chat
    if (mode === 'chat-continuation' && chatId) {
      doSubmitPulse(async () => {
        try {
          await sendMessage.mutateAsync({ message: text, chatId });
          clearDraft();
        } finally {
          setIsSubmitting(false);
        }
      });
      return;
    }

    // note-aware: defaultIntent decides between appending to note or starting a chat about it
    if (mode === 'note-aware' && noteId) {
      if (defaultIntent === 'note') {
        doSubmitPulse(async () => {
          try {
            await updateNote.mutateAsync({ id: noteId, content: text });
            clearDraft();
          } finally {
            setIsSubmitting(false);
          }
        });
      } else {
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
      }
      return;
    }

    // generic (home): defaultIntent decides note vs new chat
    if (defaultIntent === 'note') {
      doSubmitPulse(async () => {
        try {
          const title = text.slice(0, 64);
          await createNote.mutateAsync({ content: text, ...(title ? { title } : {}) });
          clearDraft();
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
    defaultIntent,
    doSubmitPulse,
    sendMessage,
    createChatMutation,
    updateNote,
    createNote,
    clearDraft,
    navigate,
  ]);

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

  // ─── Context strip label ─────────────────────────────────────────────────

  const contextLabel =
    mode === 'note-aware' && noteTitle
      ? noteTitle
      : mode === 'chat-continuation'
        ? 'Continuing conversation'
        : null;

  return (
    <>
      {/* Outer positioning wrapper — fixed, never touched by GSAP */}
      <div
        className={cn(
          'fixed bottom-0 left-1/2 z-50 -translate-x-1/2',
          'w-full max-w-[780px]',
          'px-4 sm:px-6',
          'pb-[calc(env(safe-area-inset-bottom)+16px)]',
          'pointer-events-none',
        )}
      >
        {/* Card — GSAP entry target */}
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
          {/* Context strip — shown when inside a note or chat */}
          {contextLabel ? (
            <div className="flex items-center gap-2 px-4 pb-0 pt-3">
              <span className="body-4 truncate text-text-tertiary">{contextLabel}</span>
            </div>
          ) : null}

          {/* Textarea */}
          <div className="px-4 pb-2 pt-3">
            <textarea
              ref={inputRef}
              data-testid="composer-input"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
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
            {/* Left: intent toggle (generic/note-aware) or attach tools (chat) */}
            <div className="flex items-center gap-1.5">
              {mode !== 'chat-continuation' ? (
                <IntentToggle intent={defaultIntent} onChange={setDefaultIntent} />
              ) : (
                <>
                  <ToolButton icon={<Plus className="size-[18px]" />} label="Attach or browse" />
                  <ToolButton icon={<Paperclip className="size-[18px]" />} label="Attach file" />
                </>
              )}
            </div>

            {/* Right: mic + send */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  'flex size-8 items-center justify-center rounded-full transition-colors',
                  isRecording
                    ? 'bg-destructive text-destructive-foreground'
                    : 'text-text-tertiary hover:bg-bg-surface hover:text-text-secondary',
                )}
                onClick={() => {
                  if (isRecording) setIsRecording(false);
                  else setShowVoice(true);
                }}
                aria-label={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? (
                  <StopCircle className="size-[18px]" />
                ) : (
                  <Mic className="size-[18px]" />
                )}
              </button>

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
                    : 'cursor-not-allowed bg-bg-surface text-text-tertiary',
                )}
                aria-label="Send"
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

// ─── ToolButton ───────────────────────────────────────────────────────────────

function ToolButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-full',
        'text-text-tertiary hover:bg-bg-surface hover:text-text-secondary',
        'transition-colors',
      )}
    >
      {icon}
    </button>
  );
}

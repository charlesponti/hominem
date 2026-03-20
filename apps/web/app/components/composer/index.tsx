/**
 * Composer — web translation of MobileComposer
 *
 * Layout is pixel-faithful to the mobile design:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  [textarea — grows with content, taller in draft mode]   │
 *   │  [note context chips — if attached in chat mode]         │
 *   │  ──────────────────────────────────────────────────────  │
 *   │  [●][●][●]                    [secondary ○] [primary ●]  │
 *   │  left tools (38×38 bordered)        right actions        │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Posture:
 *   capture  — focus/home: primary=Save note, secondary=Ask assistant
 *   draft    — note detail: primary=Add to note, secondary=Discuss note
 *   reply    — chat: primary=Send (arrow-up), secondary=Save as note
 *   hidden   — no composer rendered (settings etc.)
 *
 * No intent toggle — posture and route determine button roles exactly
 * as on mobile. Enter commits the primary action.
 */

import { useGSAP } from '@gsap/react';
import { useHonoMutation } from '@hominem/hono-client/react';
import {
  ArrowUp,
  BookOpen,
  Camera,
  CirclePlus,
  MessageSquare,
  Mic,
  Plus,
  StopCircle,
  X,
} from 'lucide-react';
import { useCallback, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { ChatModals } from '~/components/chat/ChatModals';
import { useCreateNote, useUpdateNote } from '~/hooks/use-notes';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import { cn } from '~/lib/utils';

import { playEntry, playSubmitPulse } from './animations';
import { useComposer } from './composer-provider';
import { deriveComposerPresentation } from './composer-presentation';
import { useComposerMode } from './use-composer-mode';
import { NotePicker } from './note-picker';
import { useSwipeGesture } from './mobile-gestures';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 38×38 bordered circle — matches mobile tool button style */
function ToolBtn({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-[38px] shrink-0 items-center justify-center rounded-full',
        'border transition-colors',
        active
          ? 'border-foreground/40 bg-bg-surface text-foreground'
          : 'border-border bg-bg-surface text-foreground',
      )}
    >
      {icon}
    </button>
  );
}

/** 38×38 bordered circle for secondary action */
function SecondaryBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex size-[38px] shrink-0 items-center justify-center rounded-full',
        'border border-border bg-bg-surface text-foreground',
        'transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {icon}
    </button>
  );
}

/** 42×42 filled circle — matches mobile primary action */
function PrimaryBtn({
  icon,
  label,
  onClick,
  disabled,
  btnRef,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  btnRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={btnRef}
      type="button"
      aria-label={label}
      data-testid="composer-primary"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex size-[42px] shrink-0 items-center justify-center rounded-full',
        'transition-colors',
        disabled
          ? 'cursor-not-allowed bg-bg-surface text-text-tertiary'
          : 'bg-foreground text-background hover:bg-foreground/85',
      )}
    >
      {icon}
    </button>
  );
}

/** Attached note chips — styled like mobile attachment chips */
function AttachedNotes({ notes, onRemove }: { notes: Note[]; onRemove: (id: string) => void }) {
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex items-center gap-1 rounded-md border border-border bg-bg-surface px-2 py-1"
        >
          <span className="max-w-[140px] truncate text-xs text-foreground">
            {note.title || 'Untitled note'}
          </span>
          <button
            type="button"
            onClick={() => onRemove(note.id)}
            aria-label={`Remove ${note.title ?? 'note'}`}
            className="text-text-tertiary transition-colors hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

export function Composer() {
  const navigate = useNavigate();
  const { mode, noteId, chatId } = useComposerMode();

  const {
    draftText,
    setDraftText,
    clearDraft,
    noteTitle,
    attachedNotes,
    clearAttachedNotes,
    detachNote,
    containerRef: cardRef,
    submitBtnRef,
    inputRef,
  } = useComposer();

  const [showVoice, setShowVoice] = useState(false);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const presentation = deriveComposerPresentation(mode, isRecording);
  if (presentation.posture === 'hidden') return null;

  const hasContent = draftText.trim().length > 0;

  // ─── Mutations ──────────────────────────────────────────────────────────

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const sendMessage = useSendMessage({ chatId: chatId ?? '' });

  const createChatMutation = useHonoMutation<{ id: string }, { seedText: string; title: string }>(
    async ({ chats }, body) => {
      const chat = await chats.create({ title: body.title });
      if (body.seedText.trim()) {
        await chats.send({ chatId: chat.id, message: body.seedText });
      }
      return chat;
    },
  );

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    containerRef: cardRef,
    isExpanded,
    setIsExpanded,
  });

  // ─── GSAP entry ─────────────────────────────────────────────────────────

  useGSAP(() => {
    if (cardRef.current) playEntry(cardRef.current);
  }, { scope: cardRef });

  // ─── Note context injection ──────────────────────────────────────────────

  function buildNoteContext(): string {
    if (attachedNotes.length === 0) return '';
    const sections = attachedNotes.map(
      (n) => `### ${n.title ?? 'Untitled note'}\n\n${n.content}`,
    );
    return `<context>\n${sections.join('\n\n---\n\n')}\n</context>\n\n`;
  }

  // ─── Submit pulse ────────────────────────────────────────────────────────

  const doSubmitPulse = useCallback(
    (then: () => void) => {
      const btn = submitBtnRef.current;
      const inp = inputRef.current;
      if (btn && inp) playSubmitPulse(btn, inp, then);
      else then();
    },
    [submitBtnRef, inputRef],
  );

  // ─── Primary action ──────────────────────────────────────────────────────
  // capture  → save as note
  // draft    → add to / update note
  // reply    → send to chat (with optional note context)

  const handlePrimary = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isSubmitting) return;
    setIsSubmitting(true);

    if (presentation.posture === 'reply' && chatId) {
      const prefix = buildNoteContext();
      const fullMessage = prefix ? `${prefix}${text}` : text;
      doSubmitPulse(async () => {
        try {
          await sendMessage.mutateAsync({ message: fullMessage, chatId });
          clearDraft();
          clearAttachedNotes();
        } finally {
          setIsSubmitting(false);
        }
      });
      return;
    }

    if (presentation.posture === 'draft' && noteId) {
      doSubmitPulse(async () => {
        try {
          await updateNote.mutateAsync({ id: noteId, content: text });
          clearDraft();
        } finally {
          setIsSubmitting(false);
        }
      });
      return;
    }

    // capture → save as note
    doSubmitPulse(async () => {
      try {
        const title = text.slice(0, 64);
        await createNote.mutateAsync({ content: text, ...(title ? { title } : {}) });
        clearDraft();
      } finally {
        setIsSubmitting(false);
      }
    });
  }, [
    draftText, isSubmitting, presentation.posture, chatId, noteId,
    doSubmitPulse, sendMessage, updateNote, createNote, clearDraft, clearAttachedNotes,
    attachedNotes,
  ]);

  // ─── Secondary action ────────────────────────────────────────────────────
  // capture  → ask assistant (start chat)
  // draft    → discuss note (start chat with note context)
  // reply    → save as note

  const handleSecondary = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isSubmitting) return;
    setIsSubmitting(true);

    if (presentation.posture === 'reply') {
      // Save as note without sending to chat
      doSubmitPulse(async () => {
        try {
          const title = text.slice(0, 64);
          await createNote.mutateAsync({ content: text, ...(title ? { title } : {}) });
          clearDraft();
        } finally {
          setIsSubmitting(false);
        }
      });
      return;
    }

    if (presentation.posture === 'draft' && noteId) {
      // Discuss note — start chat with note as context
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
      return;
    }

    // capture → ask assistant (start a new chat)
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
  }, [
    draftText, isSubmitting, presentation.posture, noteId, noteTitle,
    doSubmitPulse, createNote, createChatMutation, clearDraft, navigate,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handlePrimary();
      }
    },
    [handlePrimary],
  );

  const handleAudioTranscribed = useCallback(
    (transcript: string) => {
      setDraftText(transcript);
      setShowVoice(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [setDraftText, inputRef],
  );

  const isDraftMode = presentation.posture === 'draft';

  return (
    <>
      {/* Shell — fixed, full-width, horizontally padded, safe-area aware */}
      <div
        className={cn(
          'pointer-events-none fixed bottom-0 left-0 right-0 z-50',
          'px-2',
          'pb-[max(env(safe-area-inset-bottom),10px)]',
        )}
      >
        {/* Inner constraint — mirrors mobile's max-width for readability on wide viewports */}
        <div className="mx-auto w-full max-w-[780px]">
          {/* Card — GSAP target, styled identical to mobile container */}
          <div
            ref={cardRef}
            className={cn(
              'pointer-events-auto w-full',
              'flex flex-col gap-3',
              'rounded-[30px]',
              'border border-border bg-background',
              'overflow-hidden',
              'px-3 pb-2 pt-3',
              '[box-shadow:0_-10px_30px_rgba(15,23,42,0.08)]',
              isDraftMode && 'min-h-[160px]',
            )}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Textarea */}
            <textarea
              ref={inputRef}
              data-testid="composer-input"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={presentation.placeholder}
              rows={1}
              disabled={isSubmitting}
              className={cn(
                'w-full resize-none bg-transparent',
                'text-[16px] leading-relaxed text-foreground',
                'placeholder:text-text-tertiary',
                'border-0 p-0 outline-none focus:outline-none',
                // capture / reply: compact
                !isDraftMode && 'min-h-[38px]',
                // draft: expanded textarea matching mobile inputDraft
                isDraftMode && 'min-h-[104px] text-top',
                'max-h-48 overflow-y-auto field-sizing-content',
              )}
              aria-label="Compose message or note"
            />

            {/* Attached note chips (chat mode — Phase 2) */}
            <AttachedNotes notes={attachedNotes} onRemove={detachNote} />

            {/* Footer — identical structure to MobileComposerFooter */}
            <div className="flex items-center justify-between">
              {/* Left: tool buttons */}
              <div className="flex items-center gap-2">
                {presentation.showsNotePicker ? (
                  <ToolBtn
                    icon={<BookOpen className="size-[18px]" />}
                    label="Attach notes as context"
                    onClick={() => setShowNotePicker(true)}
                    active={attachedNotes.length > 0}
                  />
                ) : null}
                {presentation.showsAttachmentButton ? (
                  <ToolBtn
                    icon={<Plus className="size-[18px]" />}
                    label="Add attachment"
                  />
                ) : null}
                {presentation.showsAttachmentButton ? (
                  <ToolBtn
                    icon={<Camera className="size-[18px]" />}
                    label="Take photo"
                  />
                ) : null}
                {presentation.showsVoiceButton ? (
                  <ToolBtn
                    icon={
                      isRecording
                        ? <StopCircle className="size-[18px] text-destructive" />
                        : <Mic className="size-[18px]" />
                    }
                    label={isRecording ? 'Stop recording' : 'Voice note'}
                    onClick={() => {
                      if (isRecording) {
                        setIsRecording(false);
                      } else {
                        setIsRecording(true);
                        setShowVoice(true);
                      }
                    }}
                    active={isRecording}
                  />
                ) : null}
              </div>

              {/* Right: secondary + primary */}
              <div className="flex items-center gap-2">
                <SecondaryBtn
                  icon={
                    presentation.secondaryActionIcon === 'circle-plus'
                      ? <CirclePlus className="size-[18px]" />
                      : <MessageSquare className="size-[18px]" />
                  }
                  label={presentation.secondaryActionLabel}
                  onClick={() => void handleSecondary()}
                  disabled={!hasContent || isSubmitting}
                />
                <PrimaryBtn
                  btnRef={submitBtnRef}
                  icon={
                    presentation.primaryActionIcon === 'circle-plus'
                      ? <CirclePlus className="size-[18px]" />
                      : <ArrowUp className="size-[18px]" />
                  }
                  label={presentation.primaryActionLabel}
                  onClick={() => void handlePrimary()}
                  disabled={!hasContent || isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note picker sheet */}
      <NotePicker open={showNotePicker} onClose={() => setShowNotePicker(false)} />

      {/* Voice modal */}
      <ChatModals
        showAudioRecorder={showVoice}
        onCloseAudioRecorder={() => {
          setShowVoice(false);
          setIsRecording(false);
        }}
        onAudioTranscribed={handleAudioTranscribed}
      />
    </>
  );
}

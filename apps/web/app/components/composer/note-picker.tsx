/**
 * NotePicker
 *
 * A bottom sheet that lets the user search and select notes to attach as
 * LLM context before sending a chat message. Selected notes are stored in
 * ComposerProvider.attachedNotes and injected into the message on send.
 *
 * Phase 2 — Note-as-context in chat.
 */

import gsap from 'gsap';
import { Check, FileText, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Note } from '@hominem/rpc/types/notes.types';
import { Button } from '@hominem/ui/button';
import { getTimeAgo } from '@hominem/utils';

import { useNotesList } from '~/hooks/use-notes';
import { cn } from '~/lib/utils';
import { useComposerAttachedNotes } from './composer-provider';

// ─── Sheet ────────────────────────────────────────────────────────────────────

interface NotePickerProps {
  open: boolean;
  onClose: () => void;
}

export function NotePicker({ open, onClose }: NotePickerProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const { attachedNotes, attachNote, detachNote } = useComposerAttachedNotes();

  const { data: notes = [] } = useNotesList({ sortBy: 'updatedAt', sortOrder: 'desc', limit: 100 });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes as Note[];
    return (notes as Note[]).filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.excerpt?.toLowerCase().includes(q),
    );
  }, [notes, query]);

  // ─── GSAP open / close ──────────────────────────────────────────────────

  useEffect(() => {
    const sheet = sheetRef.current;
    const overlay = overlayRef.current;
    if (!sheet || !overlay) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (open) {
      if (reduced) {
        gsap.set([overlay, sheet], { opacity: 1, y: 0 });
      } else {
        gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'power2.out' });
        gsap.fromTo(sheet, { y: '100%' }, { y: '0%', duration: 0.2, ease: 'power3.out' });
      }
    } else {
      if (reduced) {
        gsap.set([overlay, sheet], { opacity: 0 });
      } else {
        gsap.to(overlay, { opacity: 0, duration: 0.12, ease: 'power2.in' });
        gsap.to(sheet, { y: '100%', duration: 0.15, ease: 'power2.in' });
      }
    }
  }, [open]);

  if (!open) return null;

  function toggleNote(note: Note) {
    if (attachedNotes.some((n) => n.id === note.id)) {
      detachNote(note.id);
    } else {
      attachNote(note);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative z-10 flex max-h-[70dvh] flex-col rounded-t-3xl border-t border-border/60 bg-background"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-md bg-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 pb-3 pt-2">
          <h2 className="heading-4 text-foreground">Attach notes</h2>
          {attachedNotes.length > 0 && (
            <span className="body-4 text-text-tertiary">{attachedNotes.length} selected</span>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto rounded-full">
            <X className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-bg-surface px-3 py-2">
            <Search className="size-4 shrink-0 text-text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-tertiary outline-none"
            />
          </div>
        </div>

        {/* Note list */}
        <ul className="flex-1 overflow-y-auto divide-y divide-border/50 px-1">
          {filtered.length === 0 ? (
            <li className="flex items-center justify-center py-10 text-text-tertiary body-2">
              No notes found
            </li>
          ) : (
            filtered.map((note) => {
              const isSelected = attachedNotes.some((n) => n.id === note.id);
              return (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => toggleNote(note)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-surface',
                      isSelected && 'bg-bg-surface',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                        isSelected
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border/60 bg-background text-text-tertiary',
                      )}
                    >
                      {isSelected ? (
                        <Check className="size-3.5" />
                      ) : (
                        <FileText className="size-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="body-1 truncate text-foreground">
                        {note.title || 'Untitled note'}
                      </div>
                      {note.excerpt && (
                        <div className="body-4 mt-0.5 line-clamp-1 text-text-tertiary">
                          {note.excerpt}
                        </div>
                      )}
                      <div className="body-4 mt-0.5 text-text-tertiary">
                        {getTimeAgo(note.updatedAt)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer */}
        <div className="border-t border-border/60 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <Button
            className="w-full rounded-md"
            onClick={onClose}
            disabled={attachedNotes.length === 0}
          >
            {attachedNotes.length > 0
              ? `Attach ${attachedNotes.length} note${attachedNotes.length > 1 ? 's' : ''}`
              : 'Select notes to attach'}
          </Button>
        </div>
      </div>
    </div>
  );
}

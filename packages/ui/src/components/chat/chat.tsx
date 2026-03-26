import type { ArtifactType, SessionSource } from '@hominem/chat-services/types';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ExtendedMessage } from '../../types/chat';
import { filterMessagesByQuery } from '../../types/chat';
import { ChatMessages } from './chat-messages';
import type { ChatRenderIcon } from './chat.types';
import { VoiceModeOverlay, type VoiceModeOverlayState } from './voice-mode-overlay';

interface ChatProps {
  source: SessionSource;
  statusCopy: string;
  resolvedSource: SessionSource;
  topInset?: number;
  renderIcon: ChatRenderIcon;
  messages: ExtendedMessage[];
  status?: string;
  isLoading?: boolean;
  error?: Error | null;
  showDebug?: boolean;
  speakingId?: string | null;
  speechLoadingId?: string | null;
  speechErrorMessage?: string | null;
  isVoiceModeActive?: boolean;
  voiceModeState?: VoiceModeOverlayState;
  voiceModeErrorMessage?: string | null;
  isVoiceModeRecording?: boolean;
  canTransform?: boolean;
  isDebugEnabled?: boolean;
  isArchiving?: boolean;
  onDebugChange?: ((enabled: boolean) => void) | undefined;
  onTransform?: ((type: ArtifactType) => void) | undefined;
  onArchive?: (() => void) | undefined;
  onOpenSearch?: (() => void) | undefined;
  onToggleVoiceMode?: (() => void) | undefined;
  onStartVoiceModeRecording?: (() => void) | undefined;
  onStopVoiceModeRecording?: (() => void) | undefined;
  onDelete?: ((messageId: string) => void) | undefined;
  onEdit?: ((messageId: string, newContent: string) => void) | undefined;
  onRegenerate?: ((messageId: string) => void) | undefined;
  onSpeak?: ((messageId: string, content: string) => void) | undefined;
}

function isMac() {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

export function Chat({
  // Intentionally unused on web — kept for API compatibility with mobile
  source: _source,
  statusCopy: _statusCopy,
  resolvedSource: _resolvedSource,
  topInset: _topInset = 0,
  renderIcon: _renderIcon,
  canTransform: _canTransform = false,
  isDebugEnabled: _isDebugEnabled = false,
  isArchiving: _isArchiving = false,
  onDebugChange: _onDebugChange,
  onTransform: _onTransform,
  onArchive: _onArchive,
  onOpenSearch: _onOpenSearch,
  // Active props
  messages,
  status = 'idle',
  isLoading = false,
  error,
  showDebug = false,
  speakingId,
  speechLoadingId,
  speechErrorMessage,
  isVoiceModeActive = false,
  voiceModeState = 'idle',
  voiceModeErrorMessage,
  isVoiceModeRecording = false,
  onToggleVoiceMode,
  onStartVoiceModeRecording,
  onStopVoiceModeRecording,
  onDelete,
  onEdit,
  onRegenerate,
  onSpeak,
}: ChatProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredMessages = useMemo(
    () => filterMessagesByQuery(messages, searchQuery),
    [messages, searchQuery],
  );

  function openSearch() {
    setIsSearchOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeSearch() {
    setIsSearchOpen(false);
    setSearchQuery('');
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = isMac() ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === 'f') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      {/* Floating search — appears on Cmd+F */}
      {isSearchOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 px-4">
          <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-center gap-2.5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]/95 px-4 py-2.5 shadow-[var(--shadow-medium)] backdrop-blur-xl">
            <Search className="size-4 shrink-0 text-[var(--color-text-tertiary)]" aria-hidden />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              aria-label="Search messages"
              className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]/50"
            />
            {searchQuery ? (
              <span className="text-[11px] font-medium tabular-nums text-[var(--color-text-tertiary)]">
                {filteredMessages.length}
              </span>
            ) : null}
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="flex size-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-emphasis-faint)] hover:text-[var(--color-text-primary)]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <ChatMessages
        messages={filteredMessages}
        status={status}
        isLoading={isLoading}
        error={error ?? null}
        showDebug={showDebug}
        speakingId={speakingId ?? null}
        speechLoadingId={speechLoadingId ?? null}
        onDelete={onDelete}
        onEdit={onEdit}
        onRegenerate={onRegenerate}
        onSpeak={onSpeak}
      />

      {speechErrorMessage ? (
        <div className="mb-3 w-full rounded-xl border border-[var(--color-destructive)]/20 bg-[var(--color-destructive-subtle)] px-4 py-2.5 text-[13px] text-[var(--color-destructive)]">
          {speechErrorMessage}
        </div>
      ) : null}

      <VoiceModeOverlay
        visible={isVoiceModeActive}
        state={voiceModeState}
        {...(voiceModeErrorMessage ? { errorMessage: voiceModeErrorMessage } : {})}
        canStop={isVoiceModeRecording}
        onClose={() => onToggleVoiceMode?.()}
        onStartRecording={() => onStartVoiceModeRecording?.()}
        onStopRecording={() => onStopVoiceModeRecording?.()}
      />
    </div>
  );
}

import type { SessionSource } from '@hominem/chat-services/types';
import type { ArtifactType } from '@hominem/chat-services/types';
import { useEffect, useMemo, useRef, useState } from 'react';

import { filterMessagesByQuery } from '../../types/chat';
import type { ExtendedMessage } from '../../types/chat';
import { ChatHeader } from './chat-header';
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
  statusCopy: _statusCopy,
  source: _source,
  resolvedSource: _resolvedSource,
  topInset: _topInset = 0,
  renderIcon: _renderIcon,
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
  canTransform: _canTransform = false,
  isDebugEnabled: _isDebugEnabled = false,
  isArchiving: _isArchiving = false,
  onDebugChange: _onDebugChange,
  onTransform: _onTransform,
  onArchive: _onArchive,
  onOpenSearch: _onOpenSearch,
  onToggleVoiceMode,
  onStartVoiceModeRecording,
  onStopVoiceModeRecording,
  onDelete,
  onEdit,
  onRegenerate,
  onSpeak,
}: ChatProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredMessages = useMemo(
    () => filterMessagesByQuery(messages, searchQuery),
    [messages, searchQuery],
  );

  // Cmd+F / Ctrl+F focuses the header search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = isMac() ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      <ChatHeader
        searchQuery={searchQuery}
        searchInputRef={searchInputRef}
        onChangeSearchQuery={setSearchQuery}
      />

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
        <div className="mx-auto mb-3 w-full max-w-3xl rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive/80">
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

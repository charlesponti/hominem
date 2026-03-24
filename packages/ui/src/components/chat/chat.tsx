import type { SessionSource } from '@hominem/chat-services/types'
import type { ArtifactType } from '@hominem/chat-services/types'
import { useRef, useState } from 'react'

import { Button } from '../ui/button'
import { ChatHeader } from './chat-header'
import { ChatMessages, type ChatMessagesHandle } from './chat-messages'
import { VoiceModeOverlay, type VoiceModeOverlayState } from './voice-mode-overlay'
import type { ChatRenderIcon } from './chat.types'
import type { ExtendedMessage } from '../../types/chat'

interface ChatProps {
  source: SessionSource
  statusCopy: string
  resolvedSource: SessionSource
  topInset?: number
  renderIcon: ChatRenderIcon
  messages: ExtendedMessage[]
  status?: string
  isLoading?: boolean
  error?: Error | null
  showDebug?: boolean
  speakingId?: string | null
  speechLoadingId?: string | null
  isVoiceModeActive?: boolean
  voiceModeState?: VoiceModeOverlayState
  voiceModeErrorMessage?: string | null
  isVoiceModeRecording?: boolean
  canTransform?: boolean
  isDebugEnabled?: boolean
  isArchiving?: boolean
  onDebugChange?: ((enabled: boolean) => void) | undefined
  onTransform?: ((type: ArtifactType) => void) | undefined
  onArchive?: (() => void) | undefined
  onOpenSearch?: (() => void) | undefined
  onToggleVoiceMode?: (() => void) | undefined
  onStartVoiceModeRecording?: (() => void) | undefined
  onStopVoiceModeRecording?: (() => void) | undefined
  onDelete?: ((messageId: string) => void) | undefined
  onEdit?: ((messageId: string, newContent: string) => void) | undefined
  onRegenerate?: ((messageId: string) => void) | undefined
  onSpeak?: ((messageId: string, content: string) => void) | undefined
}

export function Chat({
  source,
  statusCopy,
  resolvedSource,
  topInset = 0,
  renderIcon,
  messages,
  status = 'idle',
  isLoading = false,
  error,
  showDebug = false,
  speakingId,
  speechLoadingId,
  isVoiceModeActive = false,
  voiceModeState = 'idle',
  voiceModeErrorMessage,
  isVoiceModeRecording = false,
  canTransform: _canTransform = false,
  isDebugEnabled = false,
  isArchiving = false,
  onDebugChange,
  onTransform,
  onArchive,
  onOpenSearch,
  onToggleVoiceMode,
  onStartVoiceModeRecording,
  onStopVoiceModeRecording,
  onDelete,
  onEdit,
  onRegenerate,
  onSpeak,
}: ChatProps) {
  const [showMenu, setShowMenu] = useState(false)
  const messagesHandleRef = useRef<ChatMessagesHandle | null>(null)

  void source

  const handleOpenSearch = () => {
    if (onOpenSearch) {
      onOpenSearch()
      return
    }

    messagesHandleRef.current?.showSearch()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      <ChatHeader
        topInset={topInset}
        resolvedSource={resolvedSource}
        statusCopy={statusCopy}
        isVoiceModeActive={isVoiceModeActive}
        onOpenSearch={handleOpenSearch}
        onOpenMenu={() => setShowMenu((current) => !current)}
        {...(onToggleVoiceMode ? { onToggleVoiceMode } : {})}
        renderIcon={renderIcon}
      />

      {showMenu ? (
        <div className="border-b border-border-subtle bg-background/95 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleOpenSearch}>
              Search
            </Button>
            {onDebugChange ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onDebugChange(!isDebugEnabled)}>
                {isDebugEnabled ? 'Hide debug metadata' : 'Show debug metadata'}
              </Button>
            ) : null}
            {onArchive ? (
              <Button type="button" variant="ghost" size="sm" onClick={onArchive} disabled={isArchiving} className="text-destructive">
                {isArchiving ? 'Archiving...' : 'Archive chat'}
              </Button>
            ) : null}
            {onTransform ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => onTransform('note')}>Transform to note</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onTransform('task')}>Transform to task</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onTransform('task_list')}>Transform to task list</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onTransform('tracker')}>Transform to tracker</Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <ChatMessages
        ref={messagesHandleRef}
        messages={messages}
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
  )
}

import { Globe, Loader2, Mic, Paperclip, Send, StopCircle, Volume2 } from 'lucide-react'
import { Button } from '~/components/ui/button.js'
import type { ActionButtonsProps } from './types.js'

export function ActionButtons({
  onAttachment,
  onWebSearch,
  onMicrophone,
  onVoiceMode,
  onSubmit,
  onStop,
  showFileUploader,
  showAudioRecorder,
  isVoiceMode,
  isSpeaking,
  isSearching,
  isStreaming,
  canSubmit,
  hasAttachments,
  hasSearchContext,
  isOverLimit,
  trimmedValue,
  attachedFilesCount,
}: ActionButtonsProps) {
  return (
    <>
      {/* Left side icons */}
      <div className="flex gap-1 pb-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAttachment}
          className={`h-[32px] w-[32px] shrink-0 ${
            showFileUploader || hasAttachments
              ? 'text-primary bg-primary/10 hover:bg-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onWebSearch}
          disabled={isSearching}
          className={`h-[32px] w-[32px] shrink-0 ${
            hasSearchContext || trimmedValue.startsWith('[Web Search]')
              ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Web search"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Right side icons */}
      <div className="flex gap-1 pb-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMicrophone}
          className={`h-[32px] w-[32px] shrink-0 ${
            showAudioRecorder
              ? 'text-red-500 bg-red-50 hover:bg-red-100'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={showAudioRecorder ? 'Close voice recorder' : 'Open voice recorder'}
        >
          <Mic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onVoiceMode}
          className={`h-[32px] w-[32px] shrink-0 ${
            isVoiceMode
              ? isSpeaking
                ? 'text-green-500 bg-green-50 hover:bg-green-100 animate-pulse'
                : 'text-blue-500 bg-blue-50 hover:bg-blue-100'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={
            isVoiceMode
              ? isSpeaking
                ? 'Speaking... (Click to disable voice mode)'
                : 'Voice mode enabled (Click to disable)'
              : 'Enable voice mode'
          }
        >
          <Volume2 className="h-4 w-4" />
        </Button>

        {/* Send or Stop button */}
        {isStreaming ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="h-[32px] w-[32px] shrink-0"
            title="Stop generation"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            size="icon"
            disabled={!canSubmit}
            className="h-[32px] w-[32px] shrink-0"
            title={
              isOverLimit
                ? 'Message too long'
                : !trimmedValue && attachedFilesCount === 0
                  ? 'Enter a message or attach files'
                  : 'Send message'
            }
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  )
}

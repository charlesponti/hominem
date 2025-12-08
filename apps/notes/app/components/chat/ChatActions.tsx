import { Eraser, Globe, Loader2, Mic, Paperclip, Volume2 } from 'lucide-react'
import { Button } from '@hominem/ui/components/ui/button'

interface ChatActionsProps {
  onWebSearch: () => void
  onFileUpload: () => void
  onToggleVoiceMode: () => void
  onAudioRecord: () => void
  onClearChat: () => void
  isVoiceMode: boolean
  isLoading: boolean
  isSearching: boolean
  hasInput: boolean
}

export function ChatActions({
  onWebSearch,
  onFileUpload,
  onToggleVoiceMode,
  onAudioRecord,
  onClearChat,
  isVoiceMode,
  isLoading,
  isSearching,
  hasInput,
}: ChatActionsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onWebSearch}
        disabled={!hasInput || isSearching}
        title="Search the web"
      >
        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onFileUpload}
        disabled={isLoading}
        title="Attach files"
      >
        <Paperclip className="w-4 h-4" />
      </Button>

      <Button
        variant={isVoiceMode ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleVoiceMode}
        title="Toggle voice mode"
      >
        <Volume2 className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onAudioRecord}
        disabled={isLoading}
        title="Record audio"
      >
        <Mic className="w-4 h-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearChat}
        disabled={isLoading}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <Eraser className="h-3 w-3 mr-1" />
      </Button>
    </div>
  )
}

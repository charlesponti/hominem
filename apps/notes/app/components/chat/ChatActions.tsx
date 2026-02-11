import { Button } from '@hominem/ui/button';
import { Eraser, Globe, Loader2, Mic, Paperclip, Volume2 } from 'lucide-react';

interface ChatActionsProps {
  onWebSearch: () => void;
  onFileUpload: () => void;
  onToggleVoiceMode: () => void;
  onAudioRecord: () => void;
  onClearChat: () => void;
  isVoiceMode: boolean;
  isLoading: boolean;
  isSearching: boolean;
  hasInput: boolean;
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
        title="WEB SEARCH"
      >
        {isSearching ? <Loader2 className="size-4" /> : <Globe className="size-4" />}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onFileUpload}
        disabled={isLoading}
        title="ATTACH FILES"
      >
        <Paperclip className="size-4" />
      </Button>

      <Button
        variant={isVoiceMode ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleVoiceMode}
        title="VOICE MODE"
      >
        <Volume2 className="size-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onAudioRecord}
        disabled={isLoading}
        title="RECORD AUDIO"
      >
        <Mic className="size-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearChat}
        disabled={isLoading}
        className="text-xs text-muted-foreground"
      >
        <Eraser className="size-3 mr-1" />
      </Button>
    </div>
  );
}

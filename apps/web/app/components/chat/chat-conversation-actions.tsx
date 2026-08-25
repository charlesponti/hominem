import { Archive, Bug, Plus, Search, Settings2, WandSparkles } from 'lucide-react';

import { Button } from '~/components/ui/button';

export interface ChatConversationActionsProps {
  isArchiving?: boolean;
  isCreatingChat?: boolean;
  isDebugOpen?: boolean;
  canTransform?: boolean;
  isTransforming?: boolean;
  isSettingsOpen?: boolean;
  isSearchOpen?: boolean;
  onArchive: () => void;
  onDebug?: () => void;
  onNewChat: () => void;
  onResponseSettings: () => void;
  onSearch: () => void;
  onTransform?: () => void;
}

export function ChatConversationActions({
  isArchiving = false,
  isSearchOpen = false,
  isSettingsOpen = false,
  onArchive,
  onDebug,
  onNewChat,
  onResponseSettings,
  onSearch,
  isCreatingChat = false,
  isDebugOpen = false,
  canTransform = false,
  isTransforming = false,
  onTransform,
}: ChatConversationActionsProps) {
  return (
    <div aria-label="Conversation actions" className="flex items-center gap-1" role="toolbar">
      <Button
        aria-label="Search messages"
        disabled={isSearchOpen}
        onClick={onSearch}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Search aria-hidden="true" size={16} />
        Search
      </Button>
      <Button
        aria-label="Response settings"
        disabled={isSettingsOpen}
        onClick={onResponseSettings}
        size="icon-sm"
        title="Response settings"
        type="button"
        variant="ghost"
      >
        <Settings2 aria-hidden="true" size={16} />
      </Button>
      <Button
        aria-label={isDebugOpen ? 'Disable debug mode' : 'Enable debug mode'}
        aria-pressed={isDebugOpen}
        onClick={onDebug}
        size="icon-sm"
        title={isDebugOpen ? 'Disable debug mode' : 'Enable debug mode'}
        type="button"
        variant="ghost"
      >
        <Bug aria-hidden="true" size={16} />
      </Button>
      <Button
        aria-label={isTransforming ? 'Preparing note draft' : 'Create note from chat'}
        disabled={!canTransform || isTransforming}
        onClick={onTransform}
        size="icon-sm"
        title={canTransform ? 'Create note from chat' : 'No messages to transform'}
        type="button"
        variant="ghost"
      >
        <WandSparkles aria-hidden="true" size={16} />
      </Button>
      <span className="flex-1" />
      <Button
        aria-label={isCreatingChat ? 'Creating new chat' : 'Start a new chat'}
        disabled={isCreatingChat}
        onClick={onNewChat}
        size="icon-sm"
        title="Start a new chat"
        type="button"
        variant="ghost"
      >
        <Plus aria-hidden="true" size={16} />
      </Button>
      <Button
        aria-label={isArchiving ? 'Archiving conversation' : 'Archive conversation'}
        disabled={isArchiving}
        onClick={onArchive}
        size="icon-sm"
        title="Archive conversation"
        type="button"
        variant="ghost"
      >
        <Archive aria-hidden="true" size={16} />
      </Button>
    </div>
  );
}

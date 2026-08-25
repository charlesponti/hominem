import { Archive, Bug, Plus, Search, Settings2, WandSparkles } from 'lucide-react';

import { Button } from '~/components/ui/button';

export interface ChatConversationActionsProps {
  isArchiving?: boolean;
  isSettingsOpen?: boolean;
  isSearchOpen?: boolean;
  onArchive: () => void;
  onNewChat: () => void;
  onResponseSettings: () => void;
  onSearch: () => void;
}

export function ChatConversationActions({
  isArchiving = false,
  isSearchOpen = false,
  isSettingsOpen = false,
  onArchive,
  onNewChat,
  onResponseSettings,
  onSearch,
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
        aria-label="Debug mode unavailable"
        disabled
        size="icon-sm"
        title="Debug mode coming soon"
        type="button"
        variant="ghost"
      >
        <Bug aria-hidden="true" size={16} />
      </Button>
      <Button
        aria-label="Transform conversation unavailable"
        disabled
        size="icon-sm"
        title="Conversation transforms coming soon"
        type="button"
        variant="ghost"
      >
        <WandSparkles aria-hidden="true" size={16} />
      </Button>
      <span className="flex-1" />
      <Button
        aria-label="Start a new chat"
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

import {
  Archive,
  Bug,
  Check,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  WandSparkles,
} from 'lucide-react';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/dropdown-menu';
import { Button } from '~/components/ui/button';

export interface ChatConversationActionsProps {
  isArchiving?: boolean;
  isCreatingChat?: boolean;
  isDebugOpen?: boolean;
  canTransform?: boolean;
  isTransforming?: boolean;
  canExtractTasks?: boolean;
  isExtractingTasks?: boolean;
  isLinkedNote?: boolean;
  isSettingsOpen?: boolean;
  isSearchOpen?: boolean;
  onArchive: () => void;
  onDebug?: () => void;
  onNewChat: () => void;
  onResponseSettings: () => void;
  onSearch: () => void;
  onTransform?: () => void;
  onExtractTasks?: () => void;
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
  canExtractTasks = false,
  isExtractingTasks = false,
  onExtractTasks,
  isLinkedNote = false,
}: ChatConversationActionsProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <div
      aria-label="Conversation actions"
      className="flex min-w-0 items-center gap-1"
      role="toolbar"
    >
      <Button
        aria-label="Search messages"
        disabled={isSearchOpen}
        onClick={onSearch}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Search aria-hidden="true" size={16} />
        <span className="sr-only">Search</span>
      </Button>
      <DropdownMenu onOpenChange={setIsMoreOpen} open={isMoreOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-expanded={isMoreOpen}
            aria-label={isMoreOpen ? 'Close conversation actions' : 'Open conversation actions'}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal aria-hidden="true" size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Chat</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!canExtractTasks || isExtractingTasks}
            onClick={onExtractTasks}
          >
            <Check aria-hidden="true" />
            {isExtractingTasks ? 'Extracting tasks…' : 'Extract tasks'}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isSettingsOpen} onClick={onResponseSettings}>
            <Settings2 aria-hidden="true" />
            Response settings
          </DropdownMenuItem>
          <DropdownMenuItem aria-pressed={isDebugOpen} onClick={onDebug}>
            <Bug aria-hidden="true" />
            {isDebugOpen ? 'Disable debug mode' : 'Enable debug mode'}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canTransform || isTransforming} onClick={onTransform}>
            <WandSparkles aria-hidden="true" />
            {isTransforming
              ? 'Preparing note draft…'
              : isLinkedNote
                ? 'Summarize linked note'
                : 'Create note from chat'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Manage</DropdownMenuLabel>
          <DropdownMenuItem disabled={isCreatingChat} onClick={onNewChat}>
            <Plus aria-hidden="true" />
            {isCreatingChat ? 'Creating new chat…' : 'New chat'}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isArchiving} onClick={onArchive} variant="destructive">
            <Archive aria-hidden="true" />
            {isArchiving ? 'Archiving conversation…' : 'Archive conversation'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

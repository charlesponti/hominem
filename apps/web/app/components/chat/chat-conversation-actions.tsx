import { Archive, Bug, Check, MoreHorizontal, Search, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '~/components/dropdown-menu';
import { Button } from '~/components/ui/button';
import { useArchiveChat } from '~/hooks/use-chats';

export interface ChatConversationActionsProps {
  chatId: string;
  isDebugOpen?: boolean;
  canExtractTasks?: boolean;
  isExtractingTasks?: boolean;
  isSettingsOpen?: boolean;
  isSearchOpen?: boolean;
  onDebug?: () => void;
  onResponseSettings: () => void;
  onSearch: () => void;
  onExtractTasks?: () => void;
}

export function ChatConversationActions({
  chatId,
  isSearchOpen = false,
  isSettingsOpen = false,
  onDebug,
  onResponseSettings,
  onSearch,
  isDebugOpen = false,
  canExtractTasks = false,
  isExtractingTasks = false,
  onExtractTasks,
}: ChatConversationActionsProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navigate = useNavigate();
  const archiveChat = useArchiveChat({
    chatId,
    onSuccess: () => navigate('/', { viewTransition: true }),
  });

  const onArchive = () => archiveChat.mutate({ chatId });
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
          <DropdownMenuLabel className="text-xs color-muted-foreground/25">Chat</DropdownMenuLabel>
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
          <DropdownMenuItem
            disabled={archiveChat.isPending}
            onClick={onArchive}
            variant="destructive"
          >
            <Archive aria-hidden="true" />
            {archiveChat.isPending ? 'Archiving conversation…' : 'Archive conversation'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

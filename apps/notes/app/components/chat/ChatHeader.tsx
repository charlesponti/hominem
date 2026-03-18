import type {
  ArtifactType,
  SessionSource,
  ThoughtLifecycleState,
} from '@hominem/chat-services/types';
import { isArtifactTypeEnabled } from '@hominem/chat-services/types';
import { Button } from '@hominem/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@hominem/ui/dropdown';
import {
  ArrowLeft,
  Bug,
  FileStack,
  ListChecks,
  ListTodo,
  MoreHorizontal,
  Search,
  SquarePen,
} from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { ContextAnchor } from '@hominem/ui/ai-elements';

interface ChatHeaderProps {
  source: SessionSource;
  lifecycleState: ThoughtLifecycleState;
  messageCount: number;
  isDebugEnabled: boolean;
  onDebugChange: (enabled: boolean) => void;
  onOpenSearch: () => void;
  onTransform: (type: ArtifactType) => void;
}

const TRANSFORM_ITEMS: Array<{
  type: ArtifactType;
  label: string;
  icon: typeof SquarePen;
}> = [
  { type: 'note', label: 'Transform to note', icon: SquarePen },
  { type: 'task', label: 'Transform to task', icon: ListTodo },
  { type: 'task_list', label: 'Transform to task list', icon: ListChecks },
  { type: 'tracker', label: 'Transform to tracker', icon: FileStack },
];

export function ChatHeader({
  source,
  lifecycleState,
  messageCount,
  isDebugEnabled,
  onDebugChange,
  onOpenSearch,
  onTransform,
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const isBlocking = lifecycleState === 'classifying' || lifecycleState === 'persisting';
  const canTransform = messageCount > 0 && !isBlocking;
  const statusCopy =
    lifecycleState === 'classifying'
      ? 'Preparing note review'
      : lifecycleState === 'reviewing_changes'
        ? 'Review ready'
        : lifecycleState === 'persisting'
          ? 'Saving note'
          : messageCount > 0
            ? `${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`
            : 'New conversation';

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/home');
  }, [navigate]);

  return (
    <div className="shrink-0 border-b border-border/50 bg-background/70 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex w-full max-w-200 items-center gap-3 px-4 py-3 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-10 shrink-0 gap-2 rounded-lg px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-surface sm:h-11 sm:px-3"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Home</span>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium tracking-[0.05em] text-text-tertiary">
            {statusCopy}
          </div>
          <ContextAnchor
            source={source}
            className="max-w-full border-transparent bg-transparent px-0 py-0 text-sm text-foreground"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-11 shrink-0 p-0"
              aria-label="Chat actions"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Conversation</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onOpenSearch}>
              <Search className="size-4" aria-hidden="true" />
              Search
              <DropdownMenuShortcut>/</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem
              checked={isDebugEnabled}
              onCheckedChange={(checked) => onDebugChange(checked === true)}
            >
              <Bug className="size-4" aria-hidden="true" />
              Show debug metadata
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Transform</DropdownMenuLabel>
            {TRANSFORM_ITEMS.map((item) => {
              const Icon = item.icon;
              const isEnabled = isArtifactTypeEnabled(item.type);

              return (
                <DropdownMenuItem
                  key={item.type}
                  disabled={!canTransform || !isEnabled}
                  onSelect={() => {
                    if (canTransform && isEnabled) {
                      onTransform(item.type);
                    }
                  }}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

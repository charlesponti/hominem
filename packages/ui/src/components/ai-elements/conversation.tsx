import { ChevronDown, Download, MessageSquare } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface ConversationProps {
  children: ReactNode;
  className?: string;
}

export function Conversation({ children, className }: ConversationProps) {
  return <div className={cn('flex flex-col', className)}>{children}</div>;
}

interface ConversationContentProps {
  children: ReactNode;
  className?: string;
}

export function ConversationContent({ children, className }: ConversationContentProps) {
  return <div className={cn('flex flex-col gap-4', className)}>{children}</div>;
}

interface ConversationEmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function ConversationEmptyState({
  icon,
  title = 'Start a conversation',
  description = 'Messages will appear here as the conversation progresses.',
  className,
}: ConversationEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      {icon || <MessageSquare className="size-12 mb-4 text-muted-foreground" />}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

interface ConversationScrollButtonProps {
  onClick?: () => void;
  className?: string;
}

export function ConversationScrollButton({ onClick, className }: ConversationScrollButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn('size-8 rounded-full', className)}
      onClick={onClick}
    >
      <ChevronDown className="size-4" />
    </Button>
  );
}

interface ConversationDownloadProps {
  messages: Array<{ role: string; content: string }>;
  className?: string;
}

export function ConversationDownload({ messages, className }: ConversationDownloadProps) {
  const handleDownload = () => {
    const markdown = messages
      .map((msg) => {
        const role = msg.role === 'user' ? '**User**' : '**Assistant**';
        return `${role}:\n\n${msg.content}\n\n---\n`;
      })
      .join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="ghost" size="sm" className={cn('gap-2', className)} onClick={handleDownload}>
      <Download className="size-4" />
      Export
    </Button>
  );
}

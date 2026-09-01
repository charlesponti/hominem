'use client';

import type { ChatMessageToolCall } from '@hominem/chat/types';
import { CheckCircleIcon, ChevronDownIcon, ClockIcon, WrenchIcon, XCircleIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Fragment } from 'react';

import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { cn } from '~/lib/utils';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      'group not-prose mb-4 w-full overflow-hidden rounded-xl border border-border/60 bg-background/40 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/30 data-[state=open]:bg-background/50',
      className,
    )}
    {...props}
  />
);

export type ToolCallStatus = 'pending' | 'completed' | 'rejected' | 'failed';

export function getToolCallStatus(toolCall: ChatMessageToolCall): ToolCallStatus {
  if (toolCall.confirmationStatus === 'pending') return 'pending';
  if (toolCall.confirmationStatus === 'rejected') return 'rejected';
  if (toolCall.executionStatus === 'failed') return 'failed';
  return 'completed';
}

export type ToolHeaderProps = {
  title?: string;
  className?: string;
  toolName: string;
  status?: ToolCallStatus;
};

const statusLabels: Record<ToolCallStatus, string> = {
  pending: 'Awaiting Approval',
  completed: 'Completed',
  rejected: 'Denied',
  failed: 'Error',
};

const statusIcons: Record<ToolCallStatus, ReactNode> = {
  pending: <ClockIcon className="size-4 text-yellow-600" />,
  completed: <CheckCircleIcon className="size-4 text-green-600" />,
  rejected: <XCircleIcon className="size-4 text-orange-600" />,
  failed: <XCircleIcon className="size-4 text-red-600" />,
};

export const getStatusBadge = (status?: ToolCallStatus) => {
  const resolved = status ?? 'completed';
  return (
    <span
      aria-label={statusLabels[resolved]}
      className="inline-flex size-4 shrink-0 items-center justify-center"
      role="img"
    >
      {statusIcons[resolved]}
    </span>
  );
};

export const ToolHeader = ({ className, title, toolName, status, ...props }: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full items-center justify-between gap-4 p-3 text-left transition-colors hover:bg-background/20 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
      className,
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-4 text-muted-foreground" />
      {getStatusBadge(status)}
      <span className="font-medium text-sm">{title ?? toolName}</span>
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'border-border/50 border-t bg-background/15 data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4 p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ChatMessageToolCall['args'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 overflow-hidden', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <pre className="overflow-x-auto rounded-md border border-border/40 bg-muted/35 p-3 text-foreground text-xs">
      <code>{JSON.stringify(input, null, 2)}</code>
    </pre>
  </div>
);

export type ToolPreviewProps = ComponentProps<'div'> & {
  preview: NonNullable<ChatMessageToolCall['preview']>;
};

function formatPreviewLabel(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// Shown instead of raw tool-call args when a confirmation-gated tool
// provides a preview — a bare id/uuid tells a human nothing about what's
// actually about to be deleted, so this surfaces the record's real fields.
export const ToolPreview = ({ className, preview, ...props }: ToolPreviewProps) => (
  <div className={cn('space-y-2', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      About to affect
    </h4>
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-border/40 bg-muted/35 p-3 text-xs">
      {Object.entries(preview).map(([key, value]) => (
        <Fragment key={key}>
          <dt className="font-medium text-muted-foreground">{formatPreviewLabel(key)}</dt>
          <dd className="text-foreground">{formatPreviewValue(value)}</dd>
        </Fragment>
      ))}
    </dl>
  </div>
);

export type ToolApprovalActionsProps = ComponentProps<'div'> & {
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
};

export const ToolApprovalActions = ({
  className,
  onApprove,
  onReject,
  disabled,
  ...props
}: ToolApprovalActionsProps) => (
  <div
    aria-label="Tool confirmation actions"
    className={cn('flex items-center gap-2', className)}
    {...props}
  >
    <Button
      aria-label="Approve tool action"
      disabled={disabled}
      onClick={onApprove}
      size="sm"
      type="button"
    >
      Approve
    </Button>
    <Button
      aria-label="Reject tool action"
      disabled={disabled}
      onClick={onReject}
      size="sm"
      type="button"
      variant="outline"
    >
      Reject
    </Button>
  </div>
);

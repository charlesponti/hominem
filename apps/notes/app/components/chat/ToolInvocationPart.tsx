import type { ChatMessageToolCall } from '@hominem/hono-rpc/types';

import { cn } from '~/lib/utils';

interface ToolInvocationPartProps {
  toolInvocation: ChatMessageToolCall;
  index: number;
}

export function ToolInvocationPart({ toolInvocation, index }: ToolInvocationPartProps) {
  const { toolName, toolCallId, type, args, result, isError } = toolInvocation;
  const id = toolCallId || `tool-${index}`;

  if (type === 'tool-call') {
    return (
      <div
        key={id}
        className="bg-background/50 dark:bg-background/30 p-3 rounded-lg border border-border/50 mt-2"
      >
        <div className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
          <span className="text-base">🔧</span>
          <span>Calling {toolName}...</span>
        </div>
        {args && Object.keys(args).length > 0 && (
          <div className="text-xs opacity-70 mt-2 font-mono bg-muted/30 p-2 rounded">
            <pre className="whitespace-pre-wrap wrap-break-word">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (type === 'tool-result') {
    return (
      <div
        key={id}
        className={cn(
          'p-3 rounded-lg border mt-2',
          isError
            ? 'bg-destructive/10 border-destructive/20'
            : 'bg-background/50 dark:bg-background/30 border-border/50',
        )}
      >
        <div
          className={cn(
            'font-medium text-sm flex items-center gap-2',
            isError ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          <span className="text-base">{isError ? '❌' : '✅'}</span>
          <span>
            {toolName} {isError ? 'failed' : 'result'}:
          </span>
        </div>
        {result !== undefined && (
          <pre className="text-xs opacity-70 mt-2 font-mono bg-muted/30 p-2 rounded whitespace-pre-wrap wrap-break-word">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return null;
}

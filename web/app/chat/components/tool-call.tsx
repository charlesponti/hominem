import type { ChatMessageSelect } from '@hominem/utils/types'
import { ChevronDown, CircleSlash, Cpu, Terminal } from 'lucide-react'
import { useState } from 'react'
import { cn } from '~/lib/utils'
import { Card } from '../card'

interface ToolCallProps {
  call: NonNullable<ChatMessageSelect['toolCalls']>[number]
}

function formatValue(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function ToolCall({ call }: ToolCallProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const formattedArgs = formatValue(call.args)
  const formattedResult = call.result ? formatValue(call.result) : null

  return (
    <div className="group" data-testid="tool-call">
      <Card
        className={cn(
          'border border-primary/10 transition-all duration-200 overflow-hidden',
          'hover:border-primary/20 hover:shadow-md',
          call.isError && 'border-destructive/20 hover:border-destructive/30'
        )}
      >
        <div className="p-3 space-y-3">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-between group/header cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'p-1.5 rounded-lg bg-primary/5 text-primary shrink-0',
                  call.isError && 'bg-destructive/5 text-destructive'
                )}
              >
                {call.isError ? <CircleSlash size={16} /> : <Terminal size={16} />}
              </div>
              <span
                className={cn(
                  'text-sm font-medium text-primary truncate',
                  call.isError && 'text-destructive'
                )}
              >
                {call.toolName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {call.isError && (
                <span className="text-destructive text-sm shrink-0" data-testid="tool-call-error">
                  Error
                </span>
              )}
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  !isCollapsed && 'rotate-180'
                )}
              />
            </div>
          </button>

          <div
            className={cn(
              'space-y-2 overflow-hidden transition-all duration-200',
              isCollapsed && 'hidden'
            )}
          >
            <div className="relative group/args">
              <div className="absolute -left-2 -right-2 top-0 bottom-0 bg-muted/30 opacity-0 group-hover/args:opacity-100 transition-opacity rounded-md" />
              <div className="flex items-center gap-1.5 text-xs text-primary/60 px-1">
                <Cpu size={12} />
                <span>Input</span>
              </div>
              <pre
                className="relative text-xs font-mono bg-muted/20 p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all"
                data-testid="tool-call-args"
              >
                {formattedArgs}
              </pre>
            </div>

            {formattedResult && (
              <div className="relative group/result">
                <div className="absolute -left-2 -right-2 top-0 bottom-0 bg-primary/5 opacity-0 group-hover/result:opacity-100 transition-opacity rounded-md" />
                <div className="relative space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-primary/60 px-1">
                    <Cpu size={12} />
                    <span>Result</span>
                  </div>
                  <pre
                    className="text-xs font-mono bg-primary/5 p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all"
                    data-testid="tool-call-result"
                  >
                    {formattedResult}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

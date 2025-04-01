import { cn } from '@/lib/utils'
import type { ChatMessage } from '@ponti/utils/schema'
import { CircleSlash, Cpu, Terminal } from 'lucide-react'
import { Card } from '../card'

interface ToolCallProps {
  call: NonNullable<ChatMessage['toolCalls']>[number]
}

function formatValue(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function ToolCall({ call }: ToolCallProps) {
  const formattedArgs = formatValue(call.args)
  const formattedResult = call.result ? formatValue(call.result) : null

  return (
    <div className="group" data-testid="tool-call">
      <Card
        className={cn(
          'border border-primary/10 transition-all duration-200',
          'hover:border-primary/20 hover:shadow-md',
          call.isError && 'border-destructive/20 hover:border-destructive/30'
        )}
      >
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'p-1.5 rounded-lg bg-primary/5 text-primary',
                  call.isError && 'bg-destructive/5 text-destructive'
                )}
              >
                {call.isError ? <CircleSlash size={16} /> : <Terminal size={16} />}
              </div>
              <span
                className={cn(
                  'text-sm font-medium text-primary',
                  call.isError && 'text-destructive'
                )}
              >
                {call.toolName}
              </span>
            </div>
            {call.isError && (
              <span className="text-destructive text-sm" data-testid="tool-call-error">
                Error
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative group/args">
              <div className="absolute -left-2 -right-2 top-0 bottom-0 bg-muted/30 opacity-0 group-hover/args:opacity-100 transition-opacity rounded-md" />
              <pre
                className="relative text-xs font-mono bg-muted/20 p-2 rounded-md overflow-x-auto"
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
                    className="text-xs font-mono bg-primary/5 p-2 rounded-md overflow-x-auto"
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

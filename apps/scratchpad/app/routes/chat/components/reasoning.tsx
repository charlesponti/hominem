import { BrainCircuit } from 'lucide-react'
import { Card } from '~/components/ui/card'

interface ReasoningProps {
  reasoning: string
}

export function Reasoning({ reasoning }: ReasoningProps) {
  return (
    <div data-testid="message-reasoning">
      <Card className="border-primary/10 hover:border-primary/20 transition-all duration-200 hover:shadow-md overflow-hidden">
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/5 shrink-0">
              <BrainCircuit size={16} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">Reasoning</span>
          </div>

          <div className="relative group">
            <div className="absolute -left-2 -right-2 top-0 bottom-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
            <div
              className="relative text-sm text-muted-foreground p-2 whitespace-pre-wrap break-words"
              data-testid="reasoning-content"
            >
              {reasoning}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

import { Eraser } from 'lucide-react'
import { Button } from '~/components/ui/button.js'
import type { ChatControlsProps } from './types.js'

export function ChatControls({ onClearChat, disabled }: ChatControlsProps) {
  return (
    <div className="flex justify-center gap-2 mt-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearChat}
        disabled={disabled}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <Eraser className="h-3 w-3 mr-1" />
        Clear Chat
      </Button>
    </div>
  )
}

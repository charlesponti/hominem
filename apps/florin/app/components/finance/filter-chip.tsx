import { X } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface FilterChipProps {
  label: string
  onRemove: () => void
  onClick?: () => void // Reserved for future "edit filter" functionality
}

export function FilterChip({ label, onRemove, onClick }: FilterChipProps) {
  return (
    <div
      className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-muted-foreground/10 transition-colors"
      title={`Click to edit: ${label}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <span>{label}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 rounded-full hover:bg-muted-foreground/20"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

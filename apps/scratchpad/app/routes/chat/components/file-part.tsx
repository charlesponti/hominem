import type { ChatMessageFile } from '@hominem/utils/types'
import { FileIcon, ImageIcon } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Card } from '../card.js'

interface FilePartProps {
  part: ChatMessageFile
}

export function FilePart({ part }: FilePartProps) {
  const isImage = part.type === 'image'
  const filename = part.filename || 'Untitled'

  return (
    <Card
      className={cn(
        'overflow-hidden border border-primary/10 hover:border-primary/20',
        'transition-all duration-200 hover:shadow-md group'
      )}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/5 shrink-0">
            {isImage ? (
              <ImageIcon size={16} className="text-primary" />
            ) : (
              <FileIcon size={16} className="text-primary" />
            )}
          </div>
          <span className="text-sm font-medium text-primary truncate flex-1">{filename}</span>
          {!isImage && part.mimeType && (
            <span className="text-xs text-muted-foreground shrink-0">({part.mimeType})</span>
          )}
        </div>

        {isImage && part.filename && (
          <div className="relative rounded-md overflow-hidden bg-muted/20" data-testid="file-image">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={part.filename}
              alt={filename}
              className="w-full h-auto max-h-[300px] object-contain"
            />
          </div>
        )}

        {!isImage && (
          <div className="relative rounded-md overflow-hidden" data-testid="file-preview">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative text-sm text-muted-foreground p-2 bg-muted/20 break-all">
              {filename}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

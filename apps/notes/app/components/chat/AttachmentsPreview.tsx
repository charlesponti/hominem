import { Button } from '@hominem/ui/button'
import { X } from 'lucide-react'
import type { AttachmentsPreviewProps } from '~/lib/types/chat'

export function AttachmentsPreview({ files, onRemoveFile, onRemoveAll }: AttachmentsPreviewProps) {
  if (files.length === 0) return null

  return (
    <div className="mb-4 p-3 bg-background/95 backdrop-blur-sm border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Attached Files ({files.length})</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemoveAll} className="text-xs">
          Remove All
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs">
            <span className="truncate max-w-[120px]">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveFile(file.id)}
              className="size-4"
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

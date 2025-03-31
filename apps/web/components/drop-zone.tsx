import { FileUp } from 'lucide-react'
import type { DragEvent, KeyboardEvent } from 'react'

interface DropZoneProps {
  isImporting: boolean
  dragActive: boolean
  onDrop: (files: File[]) => void
  onDragOver: () => void
  onDragLeave: () => void
  onClick: () => void
}

export function DropZone({
  isImporting,
  dragActive,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
}: DropZoneProps) {
  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    onDragLeave()

    if (isImporting) return

    const items = e.dataTransfer.items
    const files: File[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type === 'text/csv') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    onDrop(files)
  }

  const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!isImporting) {
      onDragOver()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <button
      type="button"
      disabled={isImporting}
      className={`relative w-full h-40 border-2 border-dashed rounded-lg transition-colors outline-none
        ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
        ${!isImporting ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label="Drop zone for CSV files"
    >
      <div className="flex flex-col items-center justify-center h-full space-y-2">
        <FileUp className="w-8 h-8 text-gray-400" aria-hidden="true" />
        <label htmlFor="file-upload" className="text-center text-sm text-gray-600">
          {isImporting ? 'Import in progress...' : 'Drag & drop CSV files here, or click to select'}
        </label>
      </div>
    </button>
  )
}

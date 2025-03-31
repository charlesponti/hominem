import { cn } from '@/lib/utils'
import type React from 'react'
import { useCallback } from 'react'

interface DropZoneProps {
  isImporting: boolean
  dragActive: boolean
  onDrop: (files: File[]) => void
  onDragOver: () => void
  onDragLeave: () => void
  onChange?: (files: File[]) => void
  accept?: string
  multiple?: boolean
}

export function DropZone({
  isImporting,
  dragActive,
  onDrop,
  onDragOver,
  onDragLeave,
  onChange,
  accept = '.csv',
  multiple = true,
}: DropZoneProps) {
  // Handler for drop events - memoized to prevent recreations on each render
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onDragLeave()

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onDrop(Array.from(e.dataTransfer.files))
      }
    },
    [onDrop, onDragLeave]
  )

  // Shared handler function to trigger file input - memoized
  const triggerFileInput = useCallback(() => {
    if (!isImporting) {
      document.getElementById('file-input-inside-dropzone')?.click()
    }
  }, [isImporting])

  // Handler for drag over - memoized
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onDragOver()
    },
    [onDragOver]
  )

  // Handler for drag leave - memoized
  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onDragLeave()
    },
    [onDragLeave]
  )

  // Handler for click events - memoized
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      triggerFileInput()
    },
    [triggerFileInput]
  )

  // Handler for keyboard events - memoized
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Trigger click when Enter or Space is pressed
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault() // Prevent scrolling when Space is pressed
        e.stopPropagation()
        triggerFileInput()
      }
    },
    [triggerFileInput]
  )

  // Handler for file input change - memoized
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation()
      if (onChange) {
        onChange(e.target.files ? Array.from(e.target.files) : [])
      }
    },
    [onChange]
  )

  return (
    <button
      type="button"
      className={cn(
        'relative border-2 border-dashed rounded-lg p-12',
        {
          'border-primary bg-primary/5': dragActive,
          'border-gray-300 bg-gray-50': !dragActive,
        },
        'transition-colors duration-200 ease-in-out',
        'flex flex-col items-center justify-center gap-4',
        {
          'opacity-50 pointer-events-none cursor-not-allowed': isImporting,
          'cursor-pointer': !isImporting,
        }
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isImporting ? -1 : 0} // Make focusable only when not importing
      aria-disabled={isImporting}
      aria-label="Upload file area. Press Enter or Space to open file browser"
    >
      <input
        id="file-input-inside-dropzone"
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        className="sr-only"
        disabled={isImporting}
        aria-label="File input"
      />

      {/* Your existing UI content here */}
      <div className="text-center space-y-2">
        <p className="text-gray-500">
          Drag and drop files here, or{' '}
          <span className="text-primary font-medium">click to browse</span>
        </p>
        <p className="text-sm text-gray-400">Supported formats: CSV</p>
      </div>
    </button>
  )
}

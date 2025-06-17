import { Button } from '~/components/ui/button.js'
import type { SearchContextPreviewProps } from './types.js'

export function SearchContextPreview({ searchContext, onRemove }: SearchContextPreviewProps) {
  if (!searchContext) return null

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-900">Web Search Context</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-xs text-blue-700"
        >
          Remove
        </Button>
      </div>
      <p className="text-xs text-blue-800 max-h-20 overflow-y-auto">
        {searchContext.substring(0, 200)}...
      </p>
    </div>
  )
}

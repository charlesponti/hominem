import type { Content } from '@hominem/services/types'
import { Button } from '@hominem/ui/button'
import { Badge } from '@hominem/ui/components/ui/badge'
import { Card, CardContent } from '@hominem/ui/components/ui/card'
import { Edit, Trash2, X } from 'lucide-react'
import { useMemo } from 'react'

interface NoteCardProps {
  note: Content
  onEdit: (note: Content) => void
  onDelete: (id: string) => void
  onRemoveTag: (noteId: string, tagValue: string) => void
  className?: string
}

export function NoteCard({ note, onEdit, onDelete, onRemoveTag, className = '' }: NoteCardProps) {
  // Extract hashtags from content
  const extractHashtags = useMemo(() => {
    const regex = /#(\w+)/g
    const matches = note.content.match(regex)
    if (!matches) return []

    // Remove the # prefix and return unique tags
    return [...new Set(matches.map((tag) => tag.substring(1)))]
  }, [note.content])

  // Combine existing tags with content hashtags
  const allTags = useMemo(() => {
    const existingTags = note.tags?.map((tag) => tag.value) || []
    const allTagValues = [...new Set([...existingTags, ...extractHashtags])]
    return allTagValues.map((value) => ({ value }))
  }, [note.tags, extractHashtags])

  // Function to format content with highlighted hashtags
  const formatContent = (content: string) => {
    const parts = content.split(/(#\w+)/g)

    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('#')) {
            // Create a key that doesn't rely solely on index but has uniqueness
            return (
              <span
                key={`hashtag-${i}-${part.replace('#', '')}`}
                className="text-blue-600 dark:text-blue-400 font-medium"
              >
                {part}
              </span>
            )
          }
          // Create a key that doesn't rely solely on index but has uniqueness
          return <span key={`text-${i}-${part.length}`}>{part}</span>
        })}
      </>
    )
  }

  return (
    <Card
      className={`h-full flex flex-col overflow-hidden bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}
    >
      <CardContent className="p-5 flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {note.title && (
            <h3 className="font-semibold text-base mb-2 text-slate-800 dark:text-slate-100">
              {note.title}
            </h3>
          )}
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-4 line-clamp-5 overflow-hidden">
            {formatContent(note.content)}
          </p>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {allTags.map((tag: { value: string }) => (
                <Badge
                  key={tag.value}
                  variant="secondary"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100/90 text-blue-700 dark:bg-blue-700/90 dark:text-blue-100 border-0"
                >
                  {tag.value}
                  {!extractHashtags.includes(tag.value) && (
                    <button
                      type="button"
                      onClick={() => onRemoveTag(note.id, tag.value)}
                      className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-auto pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(note)}
            className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit className="size-4 mr-1" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(note.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors"
          >
            <Trash2 className="size-4 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

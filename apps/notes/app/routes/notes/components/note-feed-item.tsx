'use client'

import type { Content } from '@hominem/utils/types'
import { Edit, Hash, Trash2, X } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

interface NoteFeedItemProps {
  note: Content
  onEdit: (note: Content) => void
  onDelete: (id: string) => void
  onRemoveTag: (noteId: string, tagValue: string) => void
  className?: string
}

export function NoteFeedItem({ note, onEdit, onDelete, onRemoveTag, className = '' }: NoteFeedItemProps) {
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
            return (
              <span
                key={`hashtag-${i}-${part.replace('#', '')}`}
                className="text-blue-600 dark:text-blue-400 font-medium"
              >
                {part}
              </span>
            )
          }
          return <span key={`text-${i}-${part.length}`}>{part}</span>
        })}
      </>
    )
  }

  return (
    <div
      className={cn(
        'border-b border-slate-200 dark:border-slate-700 py-4 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 group',
        className
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            {note.title && (
              <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                {note.title}
              </h3>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date(note.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {formatContent(note.content)}
          </p>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag: { value: string }) => (
              <Badge
                key={tag.value}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-0 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {tag.value}
                {!extractHashtags.includes(tag.value) && (
                  <button
                    type="button"
                    onClick={() => onRemoveTag(note.id, tag.value)}
                    className="ml-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(note)}
              className="h-8 px-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(note.id)}
              className="h-8 px-3 text-slate-600 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Note
          </div>
        </div>
      </div>
    </div>
  )
}

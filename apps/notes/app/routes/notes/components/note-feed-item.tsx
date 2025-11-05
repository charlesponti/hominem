'use client'

import type { Note } from '@hominem/utils/types'
import { Edit, Trash2, X } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import SocialX from '~/components/icons/SocialX'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { useFeatureFlag } from '~/lib/hooks/use-feature-flags'
import { cn } from '~/lib/utils'
import { TweetModal } from './tweet-modal'

interface NoteFeedItemProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onRemoveTag: (noteId: string, tagValue: string) => void
  className?: string
}

export function NoteFeedItem({
  note,
  onEdit,
  onDelete,
  onRemoveTag,
  className = '',
}: NoteFeedItemProps) {
  const [showTweetModal, setShowTweetModal] = useState(false)
  const _isTwitterEnabled = useFeatureFlag('twitterIntegration')

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
  const formattedContent = useMemo<ReactNode>(() => {
    const parts = note.content.split(/(#\w+)/g)

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
  }, [note.content])

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
            {note.title && (
              <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                {note.title}
              </h3>
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
            {formattedContent}
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
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(note.createdAt).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTweetModal(true)}
              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-500 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
              title="Generate tweet"
            >
              <SocialX className="size-[14px]" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(note)}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Edit note"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(note.id)}
              className="h-8 w-8 p-0 text-slate-600 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
              title="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <TweetModal
        isOpen={showTweetModal}
        onClose={() => setShowTweetModal(false)}
        initialText={note.content}
        contentId={note.id}
      />
    </div>
  )
}

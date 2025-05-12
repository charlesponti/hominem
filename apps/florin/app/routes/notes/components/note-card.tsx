'use client'

import type { Content } from '@hominem/utils/types'
import { Edit, Save, Trash2, X } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

export interface FeedNote extends Content {
  type: 'note'
  feedType: 'note'
  date: string
}

interface NoteCardProps {
  note: FeedNote
  editingNoteId: string | null
  editNoteData: { title: string; content: string }
  onStartEditing: (note: FeedNote) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  onRemoveTag: (noteId: string, tagValue: string) => void
  setEditNoteData: React.Dispatch<React.SetStateAction<{ title: string; content: string }>>
}

export function NoteCard({
  note,
  editingNoteId,
  editNoteData,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onRemoveTag,
  setEditNoteData,
}: NoteCardProps) {
  const isEditing = editingNoteId === note.id

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
    <Card className="overflow-hidden bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl border border-slate-200 dark:border-slate-700">
      <CardContent className="p-5">
        {isEditing ? (
          <div className="space-y-3">
            <Input
              value={editNoteData.title}
              onChange={(e) => setEditNoteData({ ...editNoteData, title: e.target.value })}
              placeholder="Title (optional)"
              className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            />
            <Textarea
              value={editNoteData.content}
              onChange={(e) => setEditNoteData({ ...editNoteData, content: e.target.value })}
              rows={4}
              className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onSaveEdit(note.id)}
                className="bg-green-500/90 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 transition-colors"
              >
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {note.title && (
              <h3 className="font-semibold text-base mb-2 text-slate-800 dark:text-slate-100">
                {note.title}
              </h3>
            )}
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
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
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartEditing(note)}
                className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(note.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

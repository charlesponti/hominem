import type { Content, TaskStatus } from '@hominem/utils/types'
import { FileText, ListChecks, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { useContentEngine } from '~/lib/content/use-content-engine'
import { cn } from '~/lib/utils'
import { NoteCard } from './components/note-card'
import { type FeedTask, TaskCard } from './components/task-card'

interface FeedNote extends Content {
  type: 'note'
  feedType: 'note'
  date: string
}

type FeedItem = FeedNote | FeedTask
type InputMode = 'note' | 'task'

const extractHashtags = (content: string): { value: string }[] => {
  const hashtagRegex = /#(\w+)/g
  const matches = content.match(hashtagRegex)
  if (!matches) return []

  // Remove the # prefix and return unique tags as objects with value property
  return [...new Set(matches.map((tag) => tag.substring(1)))].map((tag) => ({ value: tag }))
}

export default function NotesPage() {
  const {
    items: allContentItems = [],
    createItem,
    updateItem,
    deleteItem,
    isLoading,
  } = useContentEngine({ type: ['note', 'task'] })

  const [filter, setFilter] = useState<'all' | 'note' | 'task'>('all')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteData, setEditNoteData] = useState({ title: '', content: '' })
  const feedContainerRef = useRef<HTMLDivElement>(null)

  // Form state
  const [inputValue, setInputValue] = useState('')
  const [inputTitle, setInputTitle] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('note')

  // Track previous feed length to control scroll
  const prevFeedLengthRef = useRef<number>(0)

  const feed = useMemo<FeedItem[]>(() => {
    const mappedItems = allContentItems
      .map((item): FeedItem | null => {
        if (item.type === 'note') {
          return {
            ...(item as Content & { type: 'note' }),
            feedType: 'note' as const,
            date: item.updatedAt || item.createdAt || '',
          }
        }
        if (item.type === 'task') {
          const taskMetadata = item.taskMetadata || {
            status: 'todo',
            priority: 'medium',
            completed: false,
            dueDate: null,
          }
          return {
            ...(item as Content & { type: 'task' }),
            taskMetadata,
            feedType: 'task' as const,
            date: item.updatedAt || item.createdAt || '',
          }
        }
        return null
      })
      .filter(Boolean) as FeedItem[]

    let filteredItems = mappedItems
    if (filter === 'note') filteredItems = mappedItems.filter((i) => i.feedType === 'note')
    if (filter === 'task') filteredItems = mappedItems.filter((i) => i.feedType === 'task')

    return filteredItems.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [allContentItems, filter])

  useEffect(() => {
    if (!feedContainerRef.current) {
      prevFeedLengthRef.current = feed.length
      return
    }
    // Only scroll when new items are added
    if (feed.length > prevFeedLengthRef.current) {
      setTimeout(() => {
        feedContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
    prevFeedLengthRef.current = feed.length
  }, [feed.length])

  function startEditingNote(note: FeedNote) {
    setEditingNoteId(note.id)
    setEditNoteData({ title: note.title || '', content: note.content })
    // !TODO: Populate the main input for editing, but that might be complex.
  }

  function saveEditNote(id: string) {
    const contentToSave = editNoteData.content.trim()
    const titleToSave = editNoteData.title.trim()
    const extractedTags = extractHashtags(contentToSave)

    // Get existing tags that are not hashtags (manually added)
    const item = allContentItems.find((item) => item.id === id)
    const existingManualTags =
      item?.tags?.filter(
        (tag) => !extractedTags.some((extractedTag) => extractedTag.value === tag.value)
      ) || []

    // Combine manually added tags with hashtag tags
    const combinedTags = [...existingManualTags, ...extractedTags]

    updateItem({
      id,
      title: titleToSave,
      content: contentToSave,
      tags: combinedTags,
    })

    setEditingNoteId(null)
  }

  function removeTagFromNote(noteId: string, tagValue: string) {
    const item = allContentItems.find((n) => n.id === noteId)
    if (!item) return
    const newTags = (item.tags || []).filter((tag) => tag.value !== tagValue)
    updateItem({ id: noteId, tags: newTags })
  }

  function handleDeleteItem(id: string) {
    deleteItem(id)
  }

  function handleCreateItem() {
    const contentToSave = inputValue.trim()
    const titleToSave = inputTitle.trim()

    if (!contentToSave && !titleToSave) return

    switch (inputMode) {
      case 'task': {
        if (!titleToSave && !contentToSave) return
        createItem({
          type: 'task',
          title: titleToSave,
          content: contentToSave,
          tags: [],
          taskMetadata: {
            status: 'todo',
            priority: 'medium',
            dueDate: null,
            completed: false,
          },
        })
        break
      }
      case 'note':
      default: {
        if (!contentToSave) return

        // Extract hashtags from content
        const extractedTags = extractHashtags(contentToSave)

        createItem({
          type: 'note',
          title: titleToSave,
          content: contentToSave,
          tags: extractedTags,
        })
        break
      }
    }

    setInputValue('')
    setInputTitle('')
  }

  function updateTaskStatus({ taskId, status }: { taskId: string; status: TaskStatus }) {
    const task = allContentItems.find((i) => i.id === taskId && i.type === 'task') as
      | FeedTask
      | undefined
    if (task?.taskMetadata) {
      updateItem({ id: taskId, taskMetadata: { ...task.taskMetadata, status } })
    }
  }

  function toggleTaskCompletion(taskId: string) {
    const task = allContentItems.find((i) => i.id === taskId && i.type === 'task') as
      | FeedTask
      | undefined
    if (task?.taskMetadata) {
      updateItem({
        id: taskId,
        taskMetadata: { ...task.taskMetadata, completed: !task.taskMetadata.completed },
      })
    }
  }

  return (
    <div className="relative flex flex-col max-h-screen gap-4 dark:bg-slate-900 w-full max-w-3xl mx-auto overflow-y-hidden">
      <header className="sticky top-0 z-20 py-4 w-full flex flex-col gap-3 md:flex-row justify-center items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === 'note' ? 'default' : 'outline'}
            onClick={() => setFilter('note')}
            size="sm"
          >
            Notes
          </Button>
          <Button
            variant={filter === 'task' ? 'default' : 'outline'}
            onClick={() => setFilter('task')}
            size="sm"
          >
            Tasks
          </Button>
        </div>
      </header>

      {/* Scrollable Feed Area and Footer */}
      <main className="flex flex-col flex-grow overflow-hidden">
        <div ref={feedContainerRef} className="relative flex-grow overflow-y-auto space-y-4 pb-8">
          {isLoading && <div className="text-center py-12 text-gray-500">Loading feed...</div>}
          {!isLoading && feed.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No content yet. Add something below!
            </div>
          )}
          {feed.map((item: FeedItem) =>
            item.feedType === 'note' ? (
              <NoteCard
                key={`note-${item.id}`}
                note={item as FeedNote}
                editingNoteId={editingNoteId}
                editNoteData={editNoteData}
                onStartEditing={startEditingNote}
                onSaveEdit={saveEditNote}
                onCancelEdit={() => setEditingNoteId(null)}
                onDelete={handleDeleteItem}
                onRemoveTag={removeTagFromNote}
                setEditNoteData={setEditNoteData}
              />
            ) : (
              <TaskCard
                key={`task-${item.id}`}
                task={item as FeedTask}
                onStatusChange={updateTaskStatus}
                onToggleComplete={toggleTaskCompletion}
                onDelete={handleDeleteItem}
              />
            )
          )}
        </div>
      </main>

      <footer className="flex-none max-w-3xl mx-auto w-full px-4 pb-4 pt-2 dark:bg-slate-900">
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl rounded-xl p-5 border border-slate-200/50 dark:border-slate-700/50 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:shadow-[0_0_15px_rgba(59,130,246,0.25)] before:-z-10 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/10 before:via-purple-500/10 before:to-pink-500/10 before:opacity-30 dark:before:opacity-40 before:animate-pulse after:-z-10 after:absolute after:inset-0 after:bg-gradient-to-t after:from-indigo-500/5 after:to-blue-500/5 after:opacity-20">
          <Input
            placeholder={
              inputMode === 'note'
                ? 'Note title (optional)'
                : 'Task title (required if no description)'
            }
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            className="relative z-10 mb-2 text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all"
          />
          <Textarea
            placeholder={
              inputMode === 'note'
                ? 'Type your note... Use #tag to add tags'
                : 'Type task description (optional if title exists)...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            rows={2}
            className="relative z-10 text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all"
          />
          <div className="flex justify-between items-center mt-2 relative z-10">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={inputMode === 'note' ? 'default' : 'outline'}
                onClick={() => setInputMode('note')}
                className={cn(
                  'transition-all hover:shadow-md',
                  inputMode === 'note'
                    ? 'bg-blue-500/90 hover:bg-blue-600/90 text-white backdrop-blur-sm'
                    : 'bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90'
                )}
              >
                <FileText className="h-4 w-4 mr-2" /> Note
              </Button>
              <Button
                size="sm"
                variant={inputMode === 'task' ? 'default' : 'outline'}
                onClick={() => setInputMode('task')}
                className={cn(
                  'transition-all hover:shadow-md',
                  inputMode === 'task'
                    ? 'bg-green-500/90 hover:bg-green-600/90 text-white backdrop-blur-sm'
                    : 'bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90'
                )}
              >
                <ListChecks className="h-4 w-4 mr-2" /> Task
              </Button>
            </div>
            <Button
              size="sm"
              onClick={handleCreateItem}
              disabled={
                (!inputValue.trim() && !inputTitle.trim()) ||
                (inputMode === 'note' && !inputValue.trim())
              }
              className="bg-indigo-500/90 hover:bg-indigo-600/90 text-white backdrop-blur-sm transition-all hover:shadow-md disabled:bg-slate-300/70 disabled:text-slate-500/90 dark:disabled:bg-slate-700/70 dark:disabled:text-slate-500/90"
            >
              <Send className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}

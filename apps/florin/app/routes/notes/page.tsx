'use client'

import type { Content, TaskMetadata, TaskStatus } from '@hominem/utils/types'
import {
  CheckCircle2,
  Edit,
  FileText,
  ListChecks,
  // PlusCircle, // Removed unused import
  Save,
  Send,
  Tag,
  Trash2,
  X,
} from 'lucide-react' // Added FileText, ListChecks, Send
import { useEffect, useMemo, useRef, useState } from 'react' // Added useEffect, useRef
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card' // Removed CardHeader, CardTitle
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { useContentEngine } from '~/lib/content/use-content-engine'
import { cn } from '~/lib/utils' // For conditional class names

interface FeedNote extends Content {
  type: 'note'
  feedType: 'note'
  date: string
}

interface FeedTask extends Content {
  type: 'task'
  taskMetadata: TaskMetadata
  feedType: 'task'
  date: string
}

type FeedItem = FeedNote | FeedTask
type InputMode = 'note' | 'task'

export default function NotesPage() {
  const {
    items: allContentItems = [],
    createItem,
    updateItem,
    deleteItem,
    isLoading, // Added isLoading
  } = useContentEngine({ type: ['note', 'task'] })

  const [filter, setFilter] = useState<'all' | 'note' | 'task'>('all')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteData, setEditNoteData] = useState({ title: '', content: '' })
  const [newTag, setNewTag] = useState('')

  // State for the new floating input
  const [inputValue, setInputValue] = useState('')
  const [inputTitle, setInputTitle] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('note') // Default to creating a note
  const feedContainerRef = useRef<HTMLDivElement>(null)

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
    // Scroll to bottom of feed when new items are added or on initial load
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight
    }
  }, []) // Empty dependency array to run only on mount

  function startEditingNote(note: FeedNote) {
    setEditingNoteId(note.id)
    setEditNoteData({ title: note.title || '', content: note.content })
    // Optionally, could populate the main input for editing, but that might be complex.
    // For now, editing remains in-card.
  }

  function saveEditNote(id: string) {
    updateItem({ id, title: editNoteData.title, content: editNoteData.content })
    setEditingNoteId(null)
  }

  function addTagToNote(noteId: string, tagValue: string) {
    const item = allContentItems.find((n) => n.id === noteId)
    if (!item) return
    const currentTags = item.tags || []
    if (currentTags.some((tag) => tag.value === tagValue)) return
    const newTags = [...currentTags, { value: tagValue }]
    updateItem({ id: noteId, tags: newTags })
  }

  function removeTagFromNote(noteId: string, tagValue: string) {
    const item = allContentItems.find((n) => n.id === noteId)
    if (!item) return
    const newTags = (item.tags || []).filter((tag) => tag.value !== tagValue)
    updateItem({ id: noteId, tags: newTags })
  }

  function addTag(noteId: string) {
    if (newTag.trim()) {
      addTagToNote(noteId, newTag.trim())
      setNewTag('')
    }
  }
  function handleDeleteItem(id: string) {
    // Renamed for clarity
    deleteItem(id)
  }

  function handleCreateItem() {
    const contentToSave = inputValue.trim()
    const titleToSave = inputTitle.trim()

    if (!contentToSave && !titleToSave) return // Require at least title or content for tasks, content for notes

    if (inputMode === 'note') {
      if (!contentToSave) return // Notes require content
      createItem({
        type: 'note',
        title: titleToSave,
        content: contentToSave,
        tags: [],
      })
    } else {
      // inputMode === 'task'
      if (!titleToSave && !contentToSave) return // Tasks should have a title or content (description)
      createItem({
        type: 'task',
        title: titleToSave, // Title is primary for tasks
        content: contentToSave, // Content acts as description
        tags: [],
        taskMetadata: {
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          completed: false,
        },
      })
    }
    setInputValue('')
    setInputTitle('')
    // setInputMode('note'); // Optionally reset mode or keep user's last choice
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

  // Main page layout
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header section */}
      <header className="p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Knowledge Feed</h1>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'note' ? 'default' : 'outline'}
              onClick={() => setFilter('note')}
            >
              Notes
            </Button>
            <Button
              variant={filter === 'task' ? 'default' : 'outline'}
              onClick={() => setFilter('task')}
            >
              Tasks
            </Button>
          </div>
        </div>
      </header>

      {/* Scrollable Feed Area */}
      <main
        ref={feedContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4 container mx-auto"
      >
        {isLoading && <div className="text-center py-12 text-gray-500">Loading feed...</div>}
        {!isLoading && feed.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No content yet. Add something below!
          </div>
        )}
        {feed.map((item: FeedItem) =>
          item.feedType === 'note' ? (
            <Card
              key={`note-${item.id}`}
              className="bg-white dark:bg-slate-800 shadow-lg rounded-xl"
            >
              <CardContent className="pt-6">
                {editingNoteId === item.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editNoteData.title}
                      onChange={(e) => setEditNoteData({ ...editNoteData, title: e.target.value })}
                      placeholder="Title (optional)"
                      className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                    />
                    <Textarea
                      value={editNoteData.content}
                      onChange={(e) =>
                        setEditNoteData({ ...editNoteData, content: e.target.value })
                      }
                      rows={4}
                      className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingNoteId(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={() => saveEditNote(item.id)}>
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {item.title && (
                      <h3 className="font-semibold text-lg mb-2 text-slate-800 dark:text-slate-100">
                        {item.title}
                      </h3>
                    )}
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-4">
                      {item.content}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(item.tags || []).map((tag: { value: string }) => (
                        <Badge
                          key={tag.value}
                          variant="secondary"
                          className="flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100"
                        >
                          {tag.value}
                          <button
                            type="button"
                            onClick={() => removeTagFromNote(item.id, tag.value)}
                            className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <Input
                        placeholder="Add tag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="h-8 text-sm dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                        onKeyPress={(e) => e.key === 'Enter' && addTag(item.id)}
                      />
                      <Button variant="secondary" size="sm" onClick={() => addTag(item.id)}>
                        <Tag className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEditingNote(item)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
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
      </main>

      {/* Floating Glassmorphism Input Area */}
      <footer className="sticky bottom-0 z-10 p-4">
        <div className="container mx-auto">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg shadow-xl rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <Input
              placeholder={
                inputMode === 'note'
                  ? 'Note title (optional)'
                  : 'Task title (required if no description)'
              }
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              className="mb-2 text-sm dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500"
            />
            <Textarea
              placeholder={
                inputMode === 'note'
                  ? 'Type your note...'
                  : 'Type task description (optional if title exists)...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              rows={2}
              className="text-sm dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500"
            />
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={inputMode === 'note' ? 'default' : 'outline'}
                  onClick={() => setInputMode('note')}
                  className={cn(inputMode === 'note' && 'bg-blue-500 hover:bg-blue-600 text-white')}
                >
                  <FileText className="h-4 w-4 mr-2" /> Note
                </Button>
                <Button
                  size="sm"
                  variant={inputMode === 'task' ? 'default' : 'outline'}
                  onClick={() => setInputMode('task')}
                  className={cn(
                    inputMode === 'task' && 'bg-green-500 hover:bg-green-600 text-white'
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
              >
                <Send className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

type TaskCardProps = {
  task: FeedTask
  onStatusChange: (args: { taskId: string; status: TaskStatus }) => void
  onToggleComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
}

function TaskCard({ task, onStatusChange, onToggleComplete, onDelete }: TaskCardProps) {
  const { title, taskMetadata, content } = task
  const { status, priority, completed } = taskMetadata || {}

  return (
    <Card className="overflow-hidden bg-white dark:bg-slate-800 shadow-lg rounded-xl">
      <div className="p-4 flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full mt-0.5 border-slate-300 dark:border-slate-600"
          onClick={() => onToggleComplete(task.id)}
        >
          {completed ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-slate-400 dark:border-slate-500" />
          )}
        </Button>
        <div className="flex-1">
          <h3
            className={cn(
              'font-medium text-slate-800 dark:text-slate-100',
              completed && 'line-through text-slate-500 dark:text-slate-400'
            )}
          >
            {title}
          </h3>
          {content && content !== title && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{content}</p>
          )}
          <div className="flex gap-2 mt-3">
            <Badge
              variant={
                status === 'todo'
                  ? 'outline'
                  : status === 'in-progress'
                    ? 'default'
                    : status === 'done'
                      ? 'secondary'
                      : 'destructive'
              }
              className={cn(
                status === 'in-progress' && 'bg-yellow-500 text-white dark:bg-yellow-600',
                status === 'done' && 'bg-green-500 text-white dark:bg-green-600',
                status === 'archived' && 'bg-slate-500 text-white dark:bg-slate-600'
              )}
            >
              {status}
            </Badge>
            <Badge
              variant={
                priority === 'low'
                  ? 'outline'
                  : priority === 'medium'
                    ? 'secondary'
                    : priority === 'high'
                      ? 'default'
                      : 'destructive'
              }
              className={cn(
                priority === 'high' && 'bg-red-500 text-white dark:bg-red-600',
                priority === 'urgent' && 'bg-purple-500 text-white dark:bg-purple-600'
              )}
            >
              {priority}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-1 self-start">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            onClick={() => onStatusChange({ taskId: task.id, status: 'todo' })}
            disabled={status === 'todo'}
          >
            Todo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            onClick={() => onStatusChange({ taskId: task.id, status: 'in-progress' })}
            disabled={status === 'in-progress'}
          >
            Start
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            onClick={() => onStatusChange({ taskId: task.id, status: 'done' })}
            disabled={status === 'done'}
          >
            Done
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/50"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </Card>
  )
}

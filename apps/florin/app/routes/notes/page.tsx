import type { Content, TaskStatus } from '@hominem/utils/types'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Drawer, DrawerTrigger } from '~/components/ui/drawer'
import { useContentEngine } from '~/lib/content/use-content-engine'
import { CreateItemDrawer } from './components/create-item-drawer'
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

  const [inputValue, setInputValue] = useState('')
  const [inputTitle, setInputTitle] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('note')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

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
            isActive: false,
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
  }

  function saveEditNote(id: string) {
    const contentToSave = editNoteData.content.trim()
    const titleToSave = editNoteData.title.trim()
    const extractedTags = extractHashtags(contentToSave)

    const item = allContentItems.find((item) => item.id === id)
    const existingManualTags =
      item?.tags?.filter(
        (tag) => !extractedTags.some((extractedTag) => extractedTag.value === tag.value)
      ) || []

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
            isActive: false,
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
    setIsDrawerOpen(false)
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

      <main className="flex flex-col flex-grow overflow-hidden">
        <div
          ref={feedContainerRef}
          className="relative flex-grow overflow-y-auto space-y-4 pb-8 px-4"
        >
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

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 z-40 rounded-full w-14 h-14 p-0 shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center"
            aria-label="Open create form"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </DrawerTrigger>
        <CreateItemDrawer
          inputMode={inputMode}
          setInputMode={setInputMode}
          inputValue={inputValue}
          setInputValue={setInputValue}
          inputTitle={inputTitle}
          setInputTitle={setInputTitle}
          handleCreateItem={handleCreateItem}
        />
      </Drawer>
    </div>
  )
}

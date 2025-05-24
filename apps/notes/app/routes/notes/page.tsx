import type { Content, ContentType } from '@hominem/utils/types'
import { useDebounce } from '@uidotdev/usehooks'
import { Plus, Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Drawer, DrawerTrigger } from '~/components/ui/drawer'
import { Input } from '~/components/ui/input'
import { useContentQuery } from '~/lib/content/use-content-query'
import { useDeleteContent } from '~/lib/content/use-delete-content'
import { useUpdateContent } from '~/lib/content/use-update-content'
import { cn } from '~/lib/utils'
import { CreateItemDrawer } from './components/create-item-drawer'
import { NoteCard } from './components/note-card'
import { TaskCard } from './components/task-card'

export default function NotesPage() {
  const [filter, setFilter] = useState<'all' | 'note' | 'task'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const feedContainerRef = useRef<HTMLDivElement>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const prevFeedLengthRef = useRef<number>(0)

  // State for edit mode
  const [noteToEdit, setNoteToEdit] = useState<Content | null>(null)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')

  const {
    data: allContentItems = [] as Content[],
    isLoading,
    refetch,
  } = useContentQuery({
    searchText: debouncedSearchQuery, // Changed from query to searchText
    type: filter === 'all' ? undefined : [filter as ContentType], // Changed from types to type and added type assertion
  })
  const { updateItem } = useUpdateContent()
  const deleteItem = useDeleteContent()

  useEffect(() => {
    refetch()
  }, [refetch])

  // Stats calculations
  const stats = useMemo(() => {
    const notes = allContentItems.filter((item: Content) => item.type === 'note')
    const tasks = allContentItems.filter((item: Content) => item.type === 'task')
    const completedTasks = tasks.filter((task: Content) => task.taskMetadata?.status === 'done')
    const allTags = allContentItems.flatMap((item: Content) => item.tags || [])
    const uniqueTags = [...new Set(allTags.map((tag: { value: string }) => tag.value))]

    return {
      totalNotes: notes.length,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      uniqueTags: uniqueTags.length,
      completionRate:
        tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    }
  }, [allContentItems])

  useEffect(() => {
    if (!feedContainerRef.current) {
      prevFeedLengthRef.current = allContentItems.length
      return
    }
    if (allContentItems.length > prevFeedLengthRef.current) {
      setTimeout(() => {
        feedContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
    prevFeedLengthRef.current = allContentItems.length
  }, [allContentItems.length])

  // Combined handler for editing notes and tasks
  function handleEditItem(item: Content) {
    setNoteToEdit(item) // Reuse existing state, consider renaming to itemToEdit
    setDrawerMode('edit')
    setIsDrawerOpen(true)
  }

  function removeTagFromNote(noteId: string, tagValue: string) {
    const item = allContentItems.find((n: Content) => n.id === noteId)
    if (!item) return
    const newTags = (item.tags || []).filter((tag: { value: string }) => tag.value !== tagValue)
    updateItem.mutate({ id: noteId, tags: newTags })
  }

  function handleDeleteItem(id: string) {
    deleteItem.mutate(id)
  }

  function handleDrawerSuccess() {
    setIsDrawerOpen(false)
    setNoteToEdit(null)
  }

  function handleCreateNewItem() {
    setDrawerMode('create')
    setNoteToEdit(null)
    setIsDrawerOpen(true)
  }

  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-7xl mx-auto overflow-y-hidden">
      <header className="relative z-10 top-0 py-3 border-b border-slate-300">
        <div className="px-4 md:px-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Filter buttons */}
            <div className="col-span-1 flex justify-center md:justify-end">
              <div className="flex gap-2 p-1 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  onClick={() => setFilter('all')}
                  size="sm"
                  className={cn(
                    'transition-all duration-200 hover:scale-105',
                    filter === 'all' &&
                      'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  )}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'note' ? 'default' : 'ghost'}
                  onClick={() => setFilter('note')}
                  size="sm"
                  className={cn(
                    'transition-all duration-200 hover:scale-105',
                    filter === 'note' &&
                      'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  )}
                >
                  Notes
                </Button>
                <Button
                  variant={filter === 'task' ? 'default' : 'ghost'}
                  onClick={() => setFilter('task')}
                  size="sm"
                  className={cn(
                    'transition-all duration-200 hover:scale-105',
                    filter === 'task' &&
                      'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  )}
                >
                  Tasks
                </Button>
              </div>
            </div>

            {/* Search bar */}
            <div className="col-span-1 flex flex-1 w-full justify-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search notes and tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col flex-grow overflow-hidden px-2 md:px-6">
        <div ref={feedContainerRef} className="relative flex-grow overflow-y-auto py-3">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Loading your content...</p>
            </div>
          )}

          {!isLoading && allContentItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mb-6">
                <Sparkles className="w-12 h-12 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {debouncedSearchQuery || filter !== 'all'
                  ? 'No matches found'
                  : 'Your creative space awaits'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                {debouncedSearchQuery
                  ? `No content matches "${debouncedSearchQuery}"${filter !== 'all' ? ` for ${filter}s` : ''}. Try a different search or filter.`
                  : filter !== 'all'
                    ? `No ${filter}s found. Try clearing filters or creating a new one.`
                    : 'Start capturing your thoughts and organizing your tasks. Every great idea begins here.'}
              </p>
              {!debouncedSearchQuery && filter === 'all' && (
                <Button
                  onClick={handleCreateNewItem}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first item
                </Button>
              )}
            </div>
          )}

          {allContentItems.length > 0 && (
            <>
              {/* The API now handles filtering, so direct rendering or a message if empty */}
              {allContentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    No matches found
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                    {debouncedSearchQuery
                      ? `No content matches "${debouncedSearchQuery}"${filter !== 'all' ? ` in ${filter}s` : ''}.`
                      : `No ${filter !== 'all' ? `${filter}s` : 'items'} found for the current filters.`}
                  </p>
                  <Button
                    onClick={() => {
                      setSearchQuery('')
                      setFilter('all')
                    }}
                    variant="outline"
                    className="transition-all duration-200"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {allContentItems.map((item: Content) => (
                    <div key={item.id} className="h-full">
                      {item.type === 'note' ? (
                        <NoteCard
                          note={item}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                          onRemoveTag={removeTagFromNote}
                          className="h-full"
                        />
                      ) : (
                        <TaskCard
                          task={item}
                          onDelete={handleDeleteItem}
                          onEdit={handleEditItem}
                          className="h-full"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Floating Create Note Button */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-2 right-2 z-50 size-12 rounded-full p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-110 group"
            aria-label="Create new item"
            onClick={() => {
              handleCreateNewItem()
              // Don't rely on the DrawerTrigger since we're also setting state
              setIsDrawerOpen(true)
            }}
          >
            <Plus className="h-8 w-8 group-hover:rotate-180 transition-transform duration-300" />
          </Button>
        </DrawerTrigger>
        <CreateItemDrawer
          onSuccess={handleDrawerSuccess}
          itemToEdit={noteToEdit}
          mode={drawerMode}
          defaultInputMode={filter === 'task' ? 'task' : 'note'}
        />
      </Drawer>
    </div>
  )
}

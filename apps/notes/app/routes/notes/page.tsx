import type { Note } from '@hominem/data/types'
import { Button } from '@hominem/ui/button'
import { Input } from '@hominem/ui/input'
import { useDebounce } from '@uidotdev/usehooks'
import { Plus, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDeleteNote, useNotesList, useUpdateNote } from '~/hooks/use-notes'
import { cn } from '~/lib/utils'
import { InlineCreateForm } from './components/inline-create-form'
import { NoteFeedItem } from './components/note-feed-item'
import { TaskFeedItem } from './components/task-feed-item'

const CONTENT_TYPE_OPTIONS: { value: Note['type']; label: string }[] = [
  { value: 'note', label: 'Notes' },
  { value: 'task', label: 'Tasks' },
  { value: 'timer', label: 'Timers' },
  { value: 'journal', label: 'Journal' },
  { value: 'document', label: 'Documents' },
]

export default function NotesPage() {
  const [selectedTypes, setSelectedTypes] = useState<Note['type'][]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const feedContainerRef = useRef<HTMLDivElement>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const prevFeedLengthRef = useRef<number>(0)

  // State for edit mode
  const [itemToEdit, setItemToEdit] = useState<Note | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  const {
    data: notesData,
    isLoading,
    refetch,
  } = useNotesList({
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
    query: debouncedSearchQuery || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 100,
  })

  const allContentItems = (notesData?.notes || []) as Note[]
  const updateItem = useUpdateNote()
  const deleteItem = useDeleteNote()

  // Helper functions for multiselect type filters
  const toggleContentType = (type: Note['type']) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const removeContentType = (type: Note['type']) => {
    setSelectedTypes((prev) => prev.filter((t) => t !== type))
  }

  const isAllSelected = selectedTypes.length === 0
  const getFilterDisplayText = () => {
    if (isAllSelected) return ''
    if (selectedTypes.length === 1) return ` in ${selectedTypes[0]}s`
    return ' in selected content types'
  }

  useEffect(() => {
    refetch()
  }, [refetch])

  // Stats calculations
  const _stats = useMemo(() => {
    const notes = allContentItems.filter((item) => item.type === 'note')
    const tasks = allContentItems.filter((item) => item.type === 'task')
    const timers = allContentItems.filter((item) => item.type === 'timer')
    const journals = allContentItems.filter((item) => item.type === 'journal')
    const documents = allContentItems.filter((item) => item.type === 'document')
    const completedTasks = tasks.filter((task) => task.taskMetadata?.status === 'done')
    const allTags = allContentItems.flatMap((item) => item.tags || [])
    const uniqueTags = [...new Set(allTags.map((tag: { value: string }) => tag.value))]

    return {
      totalNotes: notes.length,
      totalTasks: tasks.length,
      totalTimers: timers.length,
      totalJournals: journals.length,
      totalDocuments: documents.length,
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
  function handleEditItem(item: Note) {
    setItemToEdit(item)
    setFormMode('edit')
    setIsFormVisible(true)
  }

  function removeTagFromNote(noteId: string, tagValue: string) {
    const item = allContentItems.find((n) => n.id === noteId)
    if (!item) return
    const newTags = (item.tags || []).filter((tag: { value: string }) => tag.value !== tagValue)
    updateItem.mutate({
      id: noteId,
      data: { tags: newTags },
    })
  }

  function handleDeleteItem(id: string) {
    deleteItem.mutate({ id })
  }

  function handleFormSuccess() {
    setIsFormVisible(false)
    setItemToEdit(null)
  }

  function handleFormCancel() {
    setIsFormVisible(false)
    setItemToEdit(null)
  }

  function handleCreateNewItem() {
    setFormMode('create')
    setItemToEdit(null)
    setIsFormVisible(true)
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-7xl mx-auto">
      {/* Fixed Header */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-10">
        <div className="py-4 px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Filter chips */}
            <div className="col-span-1 flex justify-center md:justify-start">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Available content type options */}
                {CONTENT_TYPE_OPTIONS.map((option) => {
                  const isSelected = selectedTypes.includes(option.value)
                  return (
                    <Button
                      key={option.value}
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => toggleContentType(option.value)}
                      size="sm"
                      className={cn(
                        'transition-all duration-200 hover:scale-105',
                        isSelected &&
                          'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      )}
                    >
                      {option.label}
                      {isSelected && (
                        <X
                          className="ml-1 h-3 w-3"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeContentType(option.value)
                          }}
                        />
                      )}
                    </Button>
                  )
                })}
                {/* Show All button when filters are active */}
                {selectedTypes.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTypes([])}
                    size="sm"
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Show All
                  </Button>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="col-span-1 flex justify-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search notes and tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 w-full"
                />
              </div>
            </div>

            {/* Create button for desktop */}
            <div className="col-span-1 hidden md:flex justify-end">
              <Button
                onClick={handleCreateNewItem}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-hidden">
        <div ref={feedContainerRef} className="h-full overflow-y-auto">
          <div className="max-w-2xl mx-auto py-4 px-4">
            {/* Inline Create Form */}
            {isFormVisible && (
              <div className="mb-4">
                <InlineCreateForm
                  isVisible={isFormVisible}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  itemToEdit={itemToEdit}
                  mode={formMode}
                  defaultInputMode={
                    selectedTypes.includes('task') && selectedTypes.length === 1 ? 'task' : 'note'
                  }
                />
              </div>
            )}

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
                  {debouncedSearchQuery || selectedTypes.length > 0
                    ? 'No matches found'
                    : 'Your creative space awaits'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                  {debouncedSearchQuery
                    ? `No content matches "${debouncedSearchQuery}"${getFilterDisplayText()}. Try a different search or filter.`
                    : selectedTypes.length > 0
                      ? 'No content found for selected filters. Try clearing filters or creating new content.'
                      : 'Start capturing your thoughts and organizing your tasks. Every great idea begins here.'}
                </p>
                {!debouncedSearchQuery && selectedTypes.length === 0 && (
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
                        ? `No content matches "${debouncedSearchQuery}"${getFilterDisplayText()}.`
                        : 'No content found for the current filters.'}
                    </p>
                    <Button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedTypes([])
                      }}
                      variant="outline"
                      className="transition-all duration-200"
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {allContentItems.map((item: Note, index: number) => (
                      <div key={item.id}>
                        {item.type === 'task' ? (
                          <TaskFeedItem
                            task={item}
                            onDelete={handleDeleteItem}
                            onEdit={handleEditItem}
                            className={index === allContentItems.length - 1 ? 'border-b-0' : ''}
                          />
                        ) : (
                          <NoteFeedItem
                            note={item}
                            onEdit={handleEditItem}
                            onDelete={handleDeleteItem}
                            onRemoveTag={removeTagFromNote}
                            className={index === allContentItems.length - 1 ? 'border-b-0' : ''}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Floating Create Button - Mobile Only */}
      <Button
        size="lg"
        className="md:hidden fixed bottom-4 right-4 z-50 size-14 rounded-full p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-110 group"
        aria-label="Create new item"
        onClick={handleCreateNewItem}
      >
        <Plus className="h-6 w-6 group-hover:rotate-180 transition-transform duration-300" />
      </Button>
    </div>
  )
}

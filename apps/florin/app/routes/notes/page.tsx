import { motion } from 'framer-motion'
import { ChevronRight, FilePlus, PenLine, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter } from '~/components/ui/card'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { Input } from '~/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { Skeleton } from '~/components/ui/skeleton'
import { useToast } from '~/components/ui/use-toast'
import { type Note, useCreateNote, useDeleteNote, useNotes } from '~/lib/hooks/use-notes'
import { cn } from '~/lib/utils'

const emptyArray = Array.from({ length: 3 }, (_, i) => i + 1)

export default function NotesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [commandOpen, setCommandOpen] = useState(false)
  const [noteForm, setNoteForm] = useState({
    content: '',
  })

  // Reference to search input for focus management
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Get toast for notifications
  const { toast } = useToast()

  // Fetch all notes
  const { notes, isLoading: isLoadingNotes } = useNotes()

  // Use hooks for creating and deleting notes
  const { createNote, isLoading: isCreatingNote } = useCreateNote()
  const { deleteNote } = useDeleteNote()

  // Handle keyboard shortcuts for search dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Command+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus search input when command dialog opens
  useEffect(() => {
    if (commandOpen && searchInputRef.current) {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [commandOpen])

  // Handle quick note creation
  const handleQuickNote = async () => {
    // Create a new note with just content
    if (!noteForm.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some content for your note.',
        variant: 'destructive',
      })
      return
    }

    try {
      await createNote.mutateAsync({
        content: noteForm.content,
      })

      toast({
        title: 'Note created',
        description: 'Your note has been created successfully.',
      })

      setNoteForm({
        content: '',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'There was a problem saving your note.',
        variant: 'destructive',
      })
    }
  }

  // Extract the first line or first few words for auto-generated title preview
  const getAutoTitle = (content: string): string => {
    if (!content) return ''

    // Try to get the first line (up to 60 chars)
    const firstLine = content.split('\n')[0].trim()
    if (firstLine && firstLine.length <= 60) {
      return firstLine
    }

    // Otherwise get first few words (up to 60 chars)
    return content.slice(0, 60).trim() + (content.length > 60 ? '...' : '')
  }

  // Format display title (use auto-generated title if none exists)
  const getDisplayTitle = (note: Note): string => {
    if (note.title?.trim()) {
      return note.title
    }
    return getAutoTitle(note.content)
  }

  // Filter notes based on search query
  const filteredNotes = notes?.filter((note) => {
    if (!searchQuery) return true
    return (
      note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some((tag) => tag.value.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="flex flex-col bg-background pb-safe">
      <div className="sticky top-0 z-10 border-b border-border/40 pb-3 backdrop-blur-md bg-background/90">
        <div className="flex justify-between items-center py-4">
          <div className="flex w-full items-center justify-between px-4 md:px-0">
            <h1 className="text-xl font-semibold text-foreground">Notes</h1>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  className="md:hidden bg-primary text-primary-foreground rounded-full h-9 w-9 p-0"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-xl px-0">
                <SheetHeader className="px-4 sm:px-6 text-left">
                  <SheetTitle>New Note</SheetTitle>
                </SheetHeader>
                <form
                  className="flex flex-col h-full"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleQuickNote()
                  }}
                >
                  <div className="flex-1 px-4 sm:px-6 py-4">
                    <textarea
                      className="w-full h-full resize-none p-4 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Write your note here..."
                      value={noteForm.content}
                      onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                      required
                    />
                  </div>
                  <SheetFooter className="px-4 sm:px-6">
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground"
                      disabled={isCreatingNote || !noteForm.content.trim()}
                    >
                      {isCreatingNote ? 'Creating...' : 'Create Note'}
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex gap-2 text-muted-foreground"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search notes...</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="relative px-3 md:hidden">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center text-sm rounded-lg border border-input bg-background px-3 py-2 text-muted-foreground shadow-sm hover:border-primary/30 transition-all"
          >
            <Search className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Search notes...</span>
          </button>
        </div>
      </div>

      {/* Command menu for searching (keyboard accessible) */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <div className="w-full">
          <CommandInput
            ref={searchInputRef}
            placeholder="Search all notes..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-none focus-visible:ring-0 focus:outline-none"
          />
        </div>
        <CommandList className="max-h-[400px] overflow-auto">
          <CommandEmpty>No notes found.</CommandEmpty>
          <CommandGroup heading="Notes">
            {filteredNotes?.map((note) => (
              <CommandItem
                key={note.id}
                onSelect={() => {
                  navigate(`/notes/${note.id}`)
                  setCommandOpen(false)
                }}
                className="flex items-center justify-between"
              >
                <span className="truncate">{getDisplayTitle(note)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <div className="flex-1 px-0 md:px-0">
        {isLoadingNotes ? (
          <div className="px-4 md:px-6 py-4">
            <div className="space-y-4">
              {emptyArray.map((id) => (
                <div key={id} className="border border-border rounded-lg overflow-hidden">
                  <div className="p-4 animate-pulse space-y-3">
                    <Skeleton className="h-5 w-3/4 bg-muted" />
                    <Skeleton className="h-4 w-full bg-muted" />
                    <Skeleton className="h-4 w-2/3 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !filteredNotes?.length ? (
          <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-primary/5 p-4 rounded-full mb-4"
            >
              <PenLine className="h-6 w-6 text-primary" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-medium text-foreground mb-1"
            >
              No notes found
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-6"
            >
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first note to get started'}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                onClick={() => navigate('/notes/new')}
                className="bg-primary text-white rounded-full shadow-sm hover:bg-primary/90 transition-colors"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:p-6">
            {filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                layout
              >
                <Card className="overflow-hidden h-full transition-all hover:shadow-md group">
                  <button
                    type="button"
                    className="text-left w-full appearance-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none rounded-md"
                    onClick={() => navigate(`/notes/${note.id}`)}
                    aria-label={`View note: ${getDisplayTitle(note)}`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      {note.title ? (
                        <div className="flex justify-between items-start gap-3">
                          <h3 className="font-medium text-foreground text-base sm:text-lg line-clamp-1">
                            {note.title}
                          </h3>
                        </div>
                      ) : null}
                      <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                        {note.content}
                      </p>
                    </CardContent>
                    <CardFooter className="px-4 sm:px-5 py-3 border-t border-border flex justify-between items-center bg-muted/30">
                      <div className="flex gap-1.5 overflow-hidden">
                        {note.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag.value}
                            className="bg-primary/5 text-primary-foreground/80 px-2 py-0.5 rounded-full text-[11px] inline-flex items-center"
                          >
                            {tag.value}
                          </span>
                        ))}
                        {note.tags && note.tags.length > 2 && (
                          <span className="text-muted-foreground text-[11px] flex items-center">
                            +{note.tags.length - 2}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {note.updatedAt && formatDate(note.updatedAt)}
                      </span>
                    </CardFooter>
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick note input */}
      <form
        className="sticky bottom-0 left-0 w-full md:max-w-[75svw] mx-auto bg-background/80 backdrop-blur-lg border-t border-border px-4 py-3 flex gap-2 z-10"
        onSubmit={(e) => {
          e.preventDefault()
          if (!noteForm.content.trim()) return
          handleQuickNote()
        }}
        aria-label="Quick note input"
        autoComplete="off"
      >
        <Input
          className="flex-1 bg-background rounded-md px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          type="text"
          placeholder="Type your note..."
          aria-label="Note input"
          value={noteForm.content}
          onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
          required
          disabled={isCreatingNote}
        />
        <Button
          type="submit"
          className={cn(
            'bg-primary text-primary-foreground rounded-md transition',
            !noteForm.content.trim() && 'opacity-70'
          )}
          disabled={isCreatingNote || !noteForm.content.trim()}
        >
          {isCreatingNote ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  )
}

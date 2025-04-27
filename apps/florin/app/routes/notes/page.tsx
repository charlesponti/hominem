import { FilePlus, MoreHorizontal, Pen, PenLine, Plus, Search, Trash } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { useToast } from '~/components/ui/use-toast'
import { type Note, useCreateNote, useDeleteNote, useNotes } from '~/lib/hooks/use-notes'

// Hermes-inspired luxury color palette
const colors = {
  primary: '#FF6600',
  primaryLight: '#FFF0E6',
  secondary: '#8A7265',
  secondaryLight: '#E8E1D9',
  gold: '#D4AF37',
  cream: '#FDF5E6',
  dark: '#1A1A1A',
  darkGrey: '#4A4A4A',
  lightGrey: '#F5F5F5',
}

export default function NotesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [noteForm, setNoteForm] = useState({
    content: '',
  })

  // Get toast for notifications
  const { toast } = useToast()

  // Fetch all notes
  const { notes, isLoading: isLoadingNotes } = useNotes()

  // Use hooks for creating and deleting notes
  const { createNote, isLoading: isCreatingNote } = useCreateNote()
  const { deleteNote } = useDeleteNote()

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

  // Handle deleting a note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId)

      toast({
        title: 'Note deleted',
        description: 'Your note has been deleted successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'There was a problem deleting your note.',
        variant: 'destructive',
      })
    }
  }

  // Extract the preview content (first 100 characters)
  const getPreviewContent = (content: string) => {
    return content.length > 100 ? `${content.substring(0, 100)}...` : content
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

  // Luxury branded icon
  const LuxuryIcon = () => (
    <div className="h-7 w-7 relative flex items-center justify-center">
      <div className="absolute inset-0 border border-[#FF6600] rotate-45" />
      <div className="h-5 w-5 text-[#FF6600]">
        <Pen className="h-4 w-4" strokeWidth={2.5} />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen-dynamic min-h-screen-dynamic bg-background luxury-text-shadow">
      <div className="flex justify-between items-center py-4 px-3 md:px-6 mb-3">
        <div className="flex items-center" />
        <button
          type="button"
          onClick={() => navigate('/notes/new')}
          className="bg-[#FF6600] text-white rounded-full h-10 w-10 md:w-auto md:px-4 flex items-center justify-center shadow-sm hover:bg-[#E05A00] transition-colors"
        >
          <Plus className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline text-sm font-medium">New Note</span>
        </button>
      </div>

      <div className="relative px-3 md:px-6 mb-2">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[#8A7265]/60" />
        </div>
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-[#E8E1D9] focus-visible:ring-[#FF6600]/20 focus-visible:border-[#FF6600]/40 rounded-full h-9 text-sm"
        />
      </div>

      {/* Twitter-feed style notes list */}
      <ul className="flex-1 min-h-0 overflow-y-auto px-0 md:px-0 py-2">
        {isLoadingNotes ? (
          <li className="px-4 md:px-6">
            <div className="space-y-2">
              {Array(4)
                .fill(crypto.randomUUID())
                .map((id) => (
                  <div
                    key={id + Math.random()}
                    className="py-5 border-b border-border animate-pulse"
                  >
                    <Skeleton className="h-4 w-1/2 bg-[#E8E1D9] mb-2" />
                    <Skeleton className="h-3 w-2/3 bg-[#E8E1D9]" />
                  </div>
                ))}
            </div>
          </li>
        ) : !filteredNotes?.length ? (
          <li className="px-4 md:px-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-[#FFF0E6] p-4 rounded-lg mb-4">
                <PenLine className="h-6 w-6 text-[#FF6600]" />
              </div>
              <p className="text-[#1A1A1A] font-medium mb-1">No notes found</p>
              <p className="text-[#8A7265] text-sm mb-4">Create your first note</p>
              <Button
                onClick={() => navigate('/notes/new')}
                className="bg-[#FF6600] hover:bg-[#E05A00] text-white rounded-full text-sm font-medium"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </div>
          </li>
        ) : (
          filteredNotes.map((note) => (
            <li
              key={note.id}
              className="group px-4 md:px-6 py-5 border-b border-border flex items-start gap-2"
            >
              <button
                type="button"
                className="flex-1 text-left bg-transparent border-0 p-0 m-0 appearance-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md transition-colors hover:bg-muted/60 cursor-pointer outline-none"
                onClick={() => navigate(`/notes/${note.id}`)}
                aria-label={`View note: ${getDisplayTitle(note)}`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <h3 className="font-medium text-[#1A1A1A] text-base truncate">
                    {getDisplayTitle(note)}
                  </h3>
                </div>
                <p className="text-[#4A4A4A] text-sm leading-relaxed break-words mb-2">
                  {note.content}
                </p>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex gap-1.5 overflow-hidden">
                    {note.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag.value}
                        className="bg-muted text-[#8A7265] px-2 py-0.5 rounded-full text-[11px] border border-border truncate max-w-16"
                      >
                        {tag.value}
                      </span>
                    ))}
                    {note.tags && note.tags.length > 2 && (
                      <span className="text-[#8A7265] text-[11px] flex items-center">
                        +{note.tags.length - 2}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px]">
                    {note.updatedAt && formatDate(note.updatedAt)}
                  </span>
                </div>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-6 w-6 rounded-full text-[#8A7265] opacity-0 group-hover:opacity-100 hover:bg-[#F5F5F5] flex items-center justify-center transition-all mt-1"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open note menu"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    className="text-[#FF0000] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNote(note.id)
                    }}
                  >
                    <Trash className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))
        )}
      </ul>

      <form
        className="sticky bottom-0 left-0 w-full bg-background border-t border-border px-4 py-3 flex gap-2 spacing-safe-area-bottom z-10"
        onSubmit={(e) => {
          e.preventDefault()
          if (!noteForm.content.trim()) return
          handleQuickNote()
        }}
        aria-label="Send a new note"
        autoComplete="off"
      >
        <Input
          className="flex-1 bg-input rounded-md px-3 py-2 text-foreground outline-none"
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
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 font-medium shadow hover:bg-primary/90 transition"
          disabled={isCreatingNote || !noteForm.content.trim()}
        >
          {isCreatingNote ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  )
}

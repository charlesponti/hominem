'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Note, useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '@/lib/hooks/use-notes'
import {
  ArrowLeft,
  Check,
  FilePlus,
  MoreHorizontal,
  Pen,
  PenLine,
  Plus,
  Save,
  Search,
  Tag,
  Trash,
  X,
} from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Types for our note form
interface NoteForm {
  id?: string
  title?: string
  content: string
  tags: Array<{ value: string }>
}

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
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [noteForm, setNoteForm] = useState<NoteForm>({
    title: '',
    content: '',
    tags: [],
  })
  const [showEditor, setShowEditor] = useState(false)

  // Get toast for notifications
  const { toast } = useToast()

  // Fetch all notes
  const { notes, isLoading: isLoadingNotes } = useNotes()

  // Use hooks for creating, updating, and deleting notes
  const { createNote, isLoading: isCreatingNote } = useCreateNote()
  const { updateNote, isLoading: isUpdatingNote } = useUpdateNote()
  const { deleteNote } = useDeleteNote()

  // Handle loading an existing note for editing
  const handleEditNote = (noteId: string) => {
    const noteToEdit = notes?.find((note) => note.id === noteId)
    if (noteToEdit) {
      setNoteForm({
        id: noteToEdit.id,
        title: noteToEdit.title || '',
        content: noteToEdit.content,
        tags: noteToEdit.tags || [],
      })
      setActiveNoteId(noteId)
      setIsCreatingNew(false)
      setShowEditor(true)
    }
  }

  // Handle creating a new note
  const handleCreateNew = () => {
    setNoteForm({
      title: '',
      content: '',
      tags: [],
    })
    setActiveNoteId(null)
    setIsCreatingNew(true)
    setShowEditor(true)

    // Focus on content textarea after a brief delay to allow component to render
    setTimeout(() => {
      const contentTextarea = document.getElementById('note-content')
      if (contentTextarea) {
        contentTextarea.focus()
      }
    }, 100)
  }

  // Back to list view
  const handleBackToList = () => {
    setShowEditor(false)
  }

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
        title: noteForm.title || undefined, // Only include title if it's not empty
        tags: noteForm.tags,
      })

      toast({
        title: 'Note created',
        description: 'Your note has been created successfully.',
      })

      setNoteForm({
        title: '',
        content: '',
        tags: [],
      })

      setIsCreatingNew(false)
      setShowEditor(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'There was a problem saving your note.',
        variant: 'destructive',
      })
    }
  }

  // Handle saving the note (create or update)
  const handleSaveNote = async () => {
    if (!noteForm.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some content for your note.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (activeNoteId) {
        // Update existing note
        await updateNote.mutateAsync({
          noteId: activeNoteId,
          title: noteForm.title || undefined, // Only include title if it's not empty
          content: noteForm.content,
          tags: noteForm.tags,
        })
        toast({
          title: 'Note updated',
          description: 'Your note has been updated successfully.',
        })
      } else {
        // Create new note
        await createNote.mutateAsync({
          content: noteForm.content,
          title: noteForm.title || undefined, // Only include title if it's not empty
          tags: noteForm.tags,
        })
        toast({
          title: 'Note created',
          description: 'Your note has been created successfully.',
        })
        setIsCreatingNew(false)
      }
      setShowEditor(false)
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

      if (activeNoteId === noteId) {
        setActiveNoteId(null)
        setNoteForm({
          title: '',
          content: '',
          tags: [],
        })
        setShowEditor(false)
      }

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

  // Handle adding a tag
  const handleAddTag = () => {
    if (tagInput.trim() !== '') {
      setNoteForm({
        ...noteForm,
        tags: [...noteForm.tags, { value: tagInput.trim() }],
      })
      setTagInput('')
    }
  }

  // Handle removing a tag
  const handleRemoveTag = (index: number) => {
    setNoteForm({
      ...noteForm,
      tags: noteForm.tags.filter((_, i) => i !== index),
    })
  }

  // Handle keyboard interactions
  const handleKeyDown = (e: KeyboardEvent, actionFn: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      actionFn()
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
      <div className="absolute inset-0 border border-[#FF6600] rotate-45"></div>
      <div className="h-5 w-5 text-[#FF6600]">
        <Pen className="h-4 w-4" strokeWidth={2.5} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {!showEditor ? (
        <div className="max-w-screen-md mx-auto pt-3 pb-20 px-3 md:px-6">
          {/* Header with branding */}
          <div className="flex justify-between items-center py-4 mb-3">
            <div className="flex items-center">
              <LuxuryIcon />
              <h1 className="text-[#1A1A1A] text-xl md:text-2xl font-light ml-3">
                Luxe<span className="font-semibold tracking-tight">Notes</span>
              </h1>
            </div>
            
            <button
              onClick={handleCreateNew}
              className="bg-[#FF6600] text-white rounded-full h-10 w-10 md:w-auto md:px-4 flex items-center justify-center shadow-sm hover:bg-[#E05A00] transition-colors"
            >
              <Plus className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline text-sm font-medium">New Note</span>
            </button>
          </div>

          {/* Quick note input */}
          <div className="mb-4">
            <div className="bg-white border border-[#E8E1D9] rounded-lg shadow-sm overflow-hidden">
              <Textarea
                placeholder="Write a quick note..."
                className="resize-none border-none focus-visible:ring-0 text-[#4A4A4A] placeholder:text-[#8A7265]/50 text-sm px-4 py-3"
                rows={2}
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              />
              <div className="border-t border-[#E8E1D9] bg-[#FFF8F0] px-4 py-2 flex justify-end">
                <Button
                  onClick={handleQuickNote}
                  disabled={!noteForm.content.trim() || isCreatingNote}
                  className="bg-[#FF6600] hover:bg-[#E05A00] text-white rounded-full h-8 px-3 text-xs font-medium flex items-center"
                  size="sm"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {isCreatingNote ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>

          {/* Search input */}
          <div className="relative mb-5">
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

          {/* Notes Feed */}
          <div className="space-y-3">
            {isLoadingNotes ? (
              // Loading skeletons
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-2 bg-white p-4 border border-[#E8E1D9] rounded-lg animate-pulse">
                    <Skeleton className="h-5 w-2/3 bg-[#E8E1D9]" />
                    <Skeleton className="h-3.5 w-full bg-[#E8E1D9]" />
                    <Skeleton className="h-3.5 w-5/6 bg-[#E8E1D9]" />
                    <div className="flex justify-between items-center pt-2">
                      <Skeleton className="h-3 w-16 bg-[#E8E1D9]" />
                      <Skeleton className="h-3 w-12 bg-[#E8E1D9]" />
                    </div>
                  </div>
                ))
            ) : !filteredNotes?.length ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-8 text-center bg-white border border-[#E8E1D9] rounded-lg">
                <div className="bg-[#FFF0E6] p-4 rounded-lg mb-4">
                  <PenLine className="h-6 w-6 text-[#FF6600]" />
                </div>
                <p className="text-[#1A1A1A] font-medium mb-1">No notes found</p>
                <p className="text-[#8A7265] text-sm mb-4">Create your first note</p>
                <Button
                  onClick={handleCreateNew}
                  className="bg-[#FF6600] hover:bg-[#E05A00] text-white rounded-full text-sm font-medium"
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              </div>
            ) : (
              // Notes feed
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="group border border-[#E8E1D9] hover:border-[#FF6600]/30 bg-white rounded-lg overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => handleEditNote(note.id)}
                    className="w-full text-left block p-4"
                  >
                    <div className="flex justify-between mb-1.5">
                      <h3 className="font-medium text-[#1A1A1A] text-sm">
                        {getDisplayTitle(note)}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="h-6 w-6 rounded-full text-[#8A7265] opacity-0 group-hover:opacity-100 hover:bg-[#F5F5F5] flex items-center justify-center transition-all"
                            onClick={(e) => e.stopPropagation()}
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
                    </div>

                    <p className="text-[#4A4A4A] text-xs line-clamp-2 leading-relaxed">
                      {note.content}
                    </p>
                  </button>

                  <div className="flex justify-between items-center px-4 py-2 bg-[#FFF8F0] border-t border-[#E8E1D9] text-xs">
                    <div className="flex gap-1.5 overflow-hidden">
                      {note.tags?.slice(0, 2).map((tag, i) => (
                        <span
                          key={i}
                          className="bg-white text-[#8A7265] px-2 py-0.5 rounded-full text-[10px] border border-[#E8E1D9] truncate max-w-16"
                        >
                          {tag.value}
                        </span>
                      ))}
                      {note.tags && note.tags.length > 2 && (
                        <span className="text-[#8A7265] text-[10px] flex items-center">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-[#8A7265]">
                      {note.updatedAt && formatDate(note.updatedAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // Editor View
        <div className="max-w-screen-md mx-auto h-screen flex flex-col bg-white">
          <div className="border-b border-[#E8E1D9] py-3 px-4 flex items-center sticky top-0 z-10 bg-white">
            <button
              onClick={handleBackToList}
              className="mr-4 h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
              aria-label="Back to notes list"
            >
              <ArrowLeft className="h-4 w-4 text-[#1A1A1A]" />
            </button>

            <h2 className="text-[#1A1A1A] font-medium text-lg">
              {isCreatingNew ? 'New Note' : 'Edit Note'}
            </h2>
            
            <div className="ml-auto">
              <Button
                onClick={handleSaveNote}
                className="bg-[#FF6600] hover:bg-[#E05A00] text-white rounded-full text-sm font-medium h-9 px-4 shadow-sm"
                disabled={isCreatingNote || isUpdatingNote || !noteForm.content.trim()}
              >
                <Save className="h-3.5 w-3.5 mr-2" />
                {isCreatingNote || isUpdatingNote ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-4">
              {/* Title */}
              <Input
                placeholder="Title (optional)"
                className="text-lg font-medium border-none px-0 focus-visible:ring-0 placeholder:text-[#8A7265]/50 mb-2 text-[#1A1A1A]"
                value={noteForm.title || ''}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              />
              
              {/* Content area */}
              <Textarea
                id="note-content"
                placeholder="Write your note here..."
                className="min-h-[40vh] resize-none border-none focus-visible:ring-0 p-0 text-[#4A4A4A] placeholder:text-[#8A7265]/50 text-sm leading-relaxed"
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              />
              
              {/* Tags section */}
              <div className="pt-4 border-t border-[#E8E1D9] mt-4">
                <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {noteForm.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-[#FFF0E6] text-[#FF6600] text-xs px-2.5 py-1.5 rounded-full flex items-center group"
                    >
                      {tag.value}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(index)}
                        onKeyDown={(e) => handleKeyDown(e, () => handleRemoveTag(index))}
                        className="ml-1.5 text-[#FF6600]/70 hover:text-[#FF6600] flex items-center justify-center"
                        aria-label={`Remove tag ${tag.value}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 items-center">
                  <div className="flex items-center border border-[#E8E1D9] rounded-full flex-1 overflow-hidden bg-[#F5F5F5] focus-within:bg-white">
                    <Tag className="h-3.5 w-3.5 text-[#8A7265] ml-3" />
                    <Input
                      placeholder="Add a tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      className="border-none rounded-full focus-visible:ring-0 h-8 text-xs"
                    />
                  </div>
                  <Button
                    onClick={handleAddTag}
                    className="rounded-full h-8 px-3 bg-white border border-[#E8E1D9] text-[#8A7265] hover:bg-[#F5F5F5] text-xs"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
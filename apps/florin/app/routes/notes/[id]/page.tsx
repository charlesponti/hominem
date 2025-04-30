import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { useToast } from '~/components/ui/use-toast'
import { useDeleteNote, useNotes, useUpdateNote } from '~/lib/hooks/use-notes'

function NoteDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const { toast } = useToast()
  const { notes, isLoading: isLoadingNotes } = useNotes()
  const { updateNote, isLoading: isUpdatingNote } = useUpdateNote()
  const { deleteNote, isLoading: isDeletingNote } = useDeleteNote()

  const noteId = params.id
  const note = notes?.find((n) => n.id === noteId)

  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')

  if (isLoadingNotes) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>
  }

  if (!note) {
    return <div className="p-8 text-center text-destructive">Note not found</div>
  }

  const handleSave = async () => {
    if (!content.trim()) {
      toast({ title: 'Error', description: 'Content is required', variant: 'destructive' })
      return
    }

    if (!noteId) {
      toast({ title: 'Error', description: 'Note ID is required', variant: 'destructive' })
      return
    }

    try {
      await updateNote.mutateAsync({ noteId, title, content, tags: note.tags })
      toast({ title: 'Note updated', description: 'Your note was updated.' })
    } catch (err) {
      toast({ title: 'Error', description: 'Could not update note', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!noteId) {
      toast({ title: 'Error', description: 'Note ID is required', variant: 'destructive' })
      return
    }

    try {
      await deleteNote.mutateAsync(noteId)
      toast({ title: 'Note deleted', description: 'Your note was deleted.' })
      navigate('/notes')
    } catch (err) {
      toast({ title: 'Error', description: 'Could not delete note', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <header className="sticky top-0 z-20 bg-background/95 border-b border-border backdrop-blur flex items-center px-2 sm:px-4 py-2 sm:py-3 gap-2">
        <button
          type="button"
          onClick={() => navigate('/notes')}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
          aria-label="Back to notes list"
        >
          <span className="sr-only">Back</span>
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h1 className="flex-1 text-base sm:text-lg font-semibold text-foreground truncate luxury-text-shadow">
          Edit Note
        </h1>
      </header>
      <form className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-2 sm:px-4 pt-4 pb-8">
        <Input
          placeholder="Title (optional)"
          className="text-base rounded-lg sm:text-lg font-medium focus-visible:ring-2 focus-visible:ring-primary/30 placeholder:text-muted-foreground/70 mb-2 text-foreground"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          aria-label="Note title"
          autoComplete="off"
        />
        <div className="flex-1 min-h-0 flex flex-col">
          <Textarea
            placeholder="Write your note here…"
            className="flex-1 min-h-0 max-h-full resize-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/30 p-3 sm:p-4 text-foreground placeholder:text-muted-foreground/70 text-sm sm:text-base leading-relaxed bg-background transition-shadow shadow-sm focus:shadow-lg overflow-y-auto"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Note content"
            maxLength={5000}
            autoComplete="off"
          />
        </div>
        {/* Spacer for fixed buttons */}
        <div className="h-2 sm:h-4" />
      </form>
      <div className="sticky bottom-0 left-0 w-full bg-background/95 px-2 sm:px-4 py-3 flex gap-2 z-20 max-w-2xl mx-auto">
        <Button
          onClick={handleSave}
          className="bg-black text-white rounded-md text-xs sm:text-sm font-medium h-10 px-4 shadow-sm transition-colors hover:bg-primary/90 flex-1"
          disabled={isUpdatingNote || !content.trim()}
        >
          {isUpdatingNote ? 'Saving…' : 'Save'}
        </Button>
        <Button
          onClick={handleDelete}
          className="text-destructive hover:text-white rounded-md text-xs sm:text-sm font-medium h-10 px-4 shadow-sm transition-colors hover:bg-destructive/90 flex-1"
          disabled={isDeletingNote}
          variant="outline"
        >
          {isDeletingNote ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  )
}

export { NoteDetailPage }
export default NoteDetailPage

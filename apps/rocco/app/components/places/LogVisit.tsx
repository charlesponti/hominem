import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@hominem/ui/dialog'
import { Input } from '@hominem/ui/input'
import { Label } from '@hominem/ui/label'
import { Textarea } from '@hominem/ui/textarea'
import { PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRevalidator } from 'react-router'
import { trpc } from '~/lib/trpc/client'
import { PeopleMultiSelect } from './PeopleMultiSelect'

interface LogVisitProps {
  placeId: string
  placeName?: string
  visit?: {
    id: string
    title: string
    date: Date | string
    description: string | null
    visitNotes: string | null
    visitReview: string | null
    visitPeople: string | null
    visitRating: number | null
    people?: Array<{ id: string }>
  }
  trigger?: React.ReactNode
}

export function LogVisit({ placeId, placeName, visit, trigger }: LogVisitProps) {
  const isEditing = !!visit
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [visitNotes, setVisitNotes] = useState('')
  const [visitRating, setVisitRating] = useState<number | undefined>(undefined)
  const [visitReview, setVisitReview] = useState('')
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const revalidator = useRevalidator()
  const utils = trpc.useUtils()

  // Initialize form with visit data when editing
  useEffect(() => {
    if (visit && open) {
      setTitle(visit.title)
      setDescription(visit.description || '')
      setDate(new Date(visit.date).toISOString().split('T')[0])
      setVisitNotes(visit.visitNotes || '')
      setVisitRating(visit.visitRating || undefined)
      setVisitReview(visit.visitReview || '')
      // Use people array if available, otherwise try to parse visitPeople
      if (visit.people && visit.people.length > 0) {
        setSelectedPeople(visit.people.map((p) => p.id))
      } else if (visit.visitPeople) {
        // Try to parse visitPeople as JSON array or comma-separated string
        try {
          const parsed = JSON.parse(visit.visitPeople)
          if (Array.isArray(parsed)) {
            setSelectedPeople(parsed)
          }
        } catch {
          // If not JSON, treat as comma-separated (though this is legacy)
          // For now, leave empty since we can't reliably convert names to IDs
        }
      } else {
        setSelectedPeople([])
      }
    } else if (!visit && open) {
      // Reset form for new visit
      setTitle('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setVisitNotes('')
      setVisitRating(undefined)
      setVisitReview('')
      setSelectedPeople([])
    }
  }, [visit, open])

  const logVisitMutation = trpc.places.logVisit.useMutation({
    onSuccess: () => {
      setOpen(false)
      utils.places.getPlaceVisits.invalidate({ placeId })
      utils.places.getVisitStats.invalidate({ placeId })
      revalidator.revalidate()
    },
  })

  const updateVisitMutation = trpc.places.updateVisit.useMutation({
    onSuccess: () => {
      setOpen(false)
      utils.places.getPlaceVisits.invalidate({ placeId })
      utils.places.getVisitStats.invalidate({ placeId })
      revalidator.revalidate()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { return }

    if (isEditing && visit) {
      updateVisitMutation.mutate({
        visitId: visit.id,
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        visitNotes: visitNotes.trim() || undefined,
        visitRating,
        visitReview: visitReview.trim() || undefined,
        people: selectedPeople.length > 0 ? selectedPeople : undefined,
      })
    } else {
      logVisitMutation.mutate({
        placeId,
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        visitNotes: visitNotes.trim() || undefined,
        visitRating,
        visitReview: visitReview.trim() || undefined,
        people: selectedPeople.length > 0 ? selectedPeople : undefined,
      })
    }
  }

  const isLoading = logVisitMutation.isPending || updateVisitMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <PlusCircle className="size-4" />
            Add visit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (
              <>
                <span>Edit visit to</span>{' '}
                {placeName ? (
                  <span className="italic font-extralight tracking-tighter">{placeName}</span>
                ) : (
                  ''
                )}
              </>
            ) : (
              <>
                <span>Log visit to</span>{' '}
                {placeName ? (
                  <span className="italic font-extralight tracking-tighter">{placeName}</span>
                ) : (
                  ''
                )}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your visit details' : 'Record your visit to this place'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
          <div className="space-y-2">
            <Label htmlFor="visit-title">Title *</Label>
            <Input
              id="visit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Dinner at..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-date">Date *</Label>
            <Input
              id="visit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-description">Description</Label>
            <Textarea
              id="visit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-notes">Notes</Label>
            <Textarea
              id="visit-notes"
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="e.g., What you ordered, special moments..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-rating">Rating (1-5)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  type="button"
                  variant={visitRating === rating ? 'default' : 'outline'}
                  onClick={() => setVisitRating(visitRating === rating ? undefined : rating)}
                  className="flex-1"
                >
                  {rating}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-review">Review</Label>
            <Textarea
              id="visit-review"
              value={visitReview}
              onChange={(e) => setVisitReview(e.target.value)}
              placeholder="Write a review..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-people">People</Label>
            <PeopleMultiSelect
              value={selectedPeople}
              onChange={setSelectedPeople}
              placeholder="Select people..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading
                ? isEditing
                  ? 'Updating...'
                  : 'Logging...'
                : isEditing
                  ? 'Update Visit'
                  : 'Log Visit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

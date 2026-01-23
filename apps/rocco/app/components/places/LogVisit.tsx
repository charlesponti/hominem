import { Button } from '@hominem/ui/button';
import { Input } from '@hominem/ui/input';
import { Label } from '@hominem/ui/label';
import { Textarea } from '@hominem/ui/textarea';
import { useEffect, useState } from 'react';
import { useRevalidator } from 'react-router';

import { useLogVisit, useUpdateVisit, useHonoUtils } from '~/lib/hono';

import { PeopleMultiSelect } from './PeopleMultiSelect';

interface LogVisitProps {
  placeId: string;
  placeName?: string;
  visit?: {
    id: string;
    title: string;
    date: Date | string;
    description: string | null;
    visitNotes: string | null;
    visitReview: string | null;
    visitPeople: string | null;
    visitRating: number | null;
    people?: Array<{ id: string }>;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LogVisit({ placeId, placeName, visit, onSuccess, onCancel }: LogVisitProps) {
  const isEditing = !!visit;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitNotes, setVisitNotes] = useState('');
  const [visitRating, setVisitRating] = useState<number | undefined>(undefined);
  const [visitReview, setVisitReview] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const revalidator = useRevalidator();
  const utils = useHonoUtils();

  // Initialize form with visit data when editing
  useEffect(() => {
    if (visit) {
      setTitle(visit.title);
      setDescription(visit.description || '');
      setDate(new Date(visit.date).toISOString().split('T')[0]);
      setVisitNotes(visit.visitNotes || '');
      setVisitRating(visit.visitRating || undefined);
      setVisitReview(visit.visitReview || '');
      if (visit.people && visit.people.length > 0) {
        setSelectedPeople(visit.people.map((p) => p.id));
      } else if (visit.visitPeople) {
        try {
          const parsed = JSON.parse(visit.visitPeople);
          if (Array.isArray(parsed)) {
            setSelectedPeople(parsed);
          }
        } catch {
          // No-op for legacy comma-separated strings
        }
      } else {
        setSelectedPeople([]);
      }
    } else {
      setTitle('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setVisitNotes('');
      setVisitRating(undefined);
      setVisitReview('');
      setSelectedPeople([]);
    }
  }, [visit]);

  const handleSuccess = () => {
    utils.invalidate(['places', 'place-visits', placeId]);
    utils.invalidate(['places', 'visit-stats', placeId]);
    revalidator.revalidate();
    onSuccess?.();
  };

  const logVisitMutation = useLogVisit({
    onSuccess: handleSuccess,
  });

  const updateVisitMutation = useUpdateVisit({
    onSuccess: handleSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }

    if (isEditing && visit) {
      updateVisitMutation.mutate({
        id: visit.id,
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        visitNotes: visitNotes.trim() || undefined,
        visitRating,
        visitReview: visitReview.trim() || undefined,
        people: selectedPeople.length > 0 ? selectedPeople : undefined,
      });
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
      });
    }
  };

  const isLoading = logVisitMutation.isPending || updateVisitMutation.isPending;

  return (
    <section className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {isEditing ? 'Edit visit' : 'Log visit'}
        </div>
        {placeName && (
          <span className="text-xs italic font-light tracking-tight text-foreground">
            {placeName}
          </span>
        )}
      </div>
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
          <Label htmlFor="visit-people">People</Label>
          <PeopleMultiSelect
            value={selectedPeople}
            onChange={setSelectedPeople}
            placeholder="Select people..."
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel || onSuccess}>
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
    </section>
  );
}

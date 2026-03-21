import { useHonoUtils } from '@hominem/rpc/react';
import { Form } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Field } from '@hominem/ui/field';
import { Input } from '@hominem/ui/input';
import { TextArea } from '@hominem/ui/text-area';
import { TextField } from '@hominem/ui/text-field';
import { useEffect, useState } from 'react';
import { useRevalidator } from 'react-router';

import { useLogPlaceVisit, useUpdatePlaceVisit } from '../../../hooks/use-places';

import { PeopleMultiSelect } from './people-multi-select';

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
  const getDefaultDate = (): string => {
    const iso = new Date().toISOString();
    const parts = iso.split('T');
    return parts[0] || '';
  };
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(getDefaultDate());
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [visitRating, setVisitRating] = useState<number | undefined>(undefined);
  const [visitReview, setVisitReview] = useState<string>('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const revalidator = useRevalidator();
  const utils = useHonoUtils();

  // Initialize form with visit data when editing
  useEffect(() => {
    if (visit) {
      setTitle(visit.title);
      setDescription(visit.description || '');
      setDate(new Date(visit.date).toISOString().split('T')[0] ?? getDefaultDate());
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
      setDate(getDefaultDate());
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

  const logVisitMutation = useLogPlaceVisit({
    onSuccess: handleSuccess,
  });

  const updateVisitMutation = useUpdatePlaceVisit({
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
      <Form onSubmit={handleSubmit} className="min-w-0">
        <TextField
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Dinner at..."
        />

        <Field label="Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>

        <TextArea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={2}
        />

        <Field label="Rating (1-5)">
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
        </Field>

        <Field label="People">
          <PeopleMultiSelect
            value={selectedPeople}
            onChange={setSelectedPeople}
            placeholder="Select people..."
          />
        </Field>

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
      </Form>
    </section>
  );
}

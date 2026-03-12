import { useAuthContext } from '@hominem/auth';
import { Inline } from '@hominem/ui';
import { Field } from '@hominem/ui/field';
import { Input } from '@hominem/ui/input';
import { SelectField } from '@hominem/ui/select-field';
import { TextField } from '@hominem/ui/text-field';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { useMyVisits } from '~/lib/hooks/use-places';
import { buildImageUrl } from '~/lib/utils';

export default function VisitsPage() {
  const { isAuthenticated } = useAuthContext();
  const [placeFilter, setPlaceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const { data: visitsData, isLoading } = useMyVisits(
    {}, // TODO: Add date filtering support to API or client-side filtering
    { enabled: isAuthenticated },
  );

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="heading-3 mb-4">My Visits</h1>
        <p className="text-muted-foreground">Sign in to view visits.</p>
      </div>
    );
  }

  const visits = visitsData ?? [];

  const filteredVisits =
    visits
      ?.filter((visit) => {
        if (!placeFilter) {
          return true;
        }
        const placeName = visit.place?.name || '';
        return placeName.toLowerCase().includes(placeFilter.toLowerCase());
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      }) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="heading-3 mb-2">My Visits</h1>
        <p className="text-muted-foreground">Track your visits to places</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <TextField
            className="flex-1"
            label="Filter by place"
            placeholder="Search places..."
            value={placeFilter}
            onChange={(e) => setPlaceFilter(e.target.value)}
          />

          <Field label="Start date">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>

          <Field label="End date">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>

          <SelectField
            label="Sort"
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value === 'oldest' ? 'oldest' : 'newest')}
            options={[
              { label: 'Newest first', value: 'newest' },
              { label: 'Oldest first', value: 'oldest' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading visits</div>
      ) : filteredVisits.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {visits?.length === 0 ? 'No visits recorded.' : 'No visits match filters.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => (
            <div key={visit.id} className="border p-4">
              <div className="flex items-start gap-4">
                {visit.place?.imageUrl && (
                  <Link to={`/places/${visit.place.id}`} className="shrink-0">
                    <img
                      src={buildImageUrl(visit.place.imageUrl)}
                      alt={visit.place.name}
                      className="size-16 object-cover"
                    />
                  </Link>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link to={`/places/${visit.placeId}`} className="hover:underline">
                        <h3 className="font-semibold text-lg">{visit.title}</h3>
                      </Link>
                      {visit.place && (
                        <Link
                          to={`/places/${visit.place.id}`}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          {visit.place.name}
                        </Link>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(visit.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    {visit.visitRating && (
                      <Inline gap="xs" className="shrink-0">
                        <Star className="size-4 fill-foreground text-foreground" />
                        <span className="text-sm font-medium">{visit.visitRating}</span>
                      </Inline>
                    )}
                  </div>

                  {visit.description && (
                    <p className="text-sm text-muted-foreground mt-2">{visit.description}</p>
                  )}

                  {visit.visitNotes && (
                    <p className="text-sm mt-2">
                      <span className="font-medium">Notes:</span> {visit.visitNotes}
                    </p>
                  )}

                  {visit.visitReview && (
                    <p className="text-sm mt-2">
                      <span className="font-medium">Review:</span> {visit.visitReview}
                    </p>
                  )}

                  {visit.people && visit.people.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">With:</span> {visit.people.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

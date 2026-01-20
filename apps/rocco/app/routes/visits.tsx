import { useSupabaseAuthContext } from '@hominem/auth';
import { Label } from '@hominem/ui/components/ui/label';
import { Input } from '@hominem/ui/input';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { trpc } from '~/lib/trpc/client';
import { buildImageUrl } from '~/lib/utils';

export default function VisitsPage() {
  const { isAuthenticated } = useSupabaseAuthContext();
  const [placeFilter, setPlaceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const { data: visits, isLoading } = trpc.places.getMyVisits.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">My Visits</h1>
        <p className="text-muted-foreground">Please sign in to view your visits.</p>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold mb-2">My Visits</h1>
        <p className="text-muted-foreground">Track your visits to places</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="place-filter">Filter by place</Label>
            <Input
              id="place-filter"
              placeholder="Search places..."
              value={placeFilter}
              onChange={(e) => setPlaceFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Start date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">End date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort">Sort</Label>
            <select
              id="sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading visits...</div>
      ) : filteredVisits.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {visits?.length === 0
            ? 'No visits recorded yet. Start logging your visits to places!'
            : 'No visits match your filters.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => (
            <div key={visit.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {visit.place?.imageUrl && (
                  <Link to={`/places/${visit.place.id}`} className="shrink-0">
                    <img
                      src={buildImageUrl(visit.place.imageUrl)}
                      alt={visit.place.name}
                      className="size-16 rounded-md object-cover"
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
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{visit.visitRating}</span>
                      </div>
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

                  {visit.visitPeople && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">With:</span> {visit.visitPeople}
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

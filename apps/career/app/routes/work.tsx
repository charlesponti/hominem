import type { CareerPositionRecord } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { Input } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Button } from '@ponti-studios/ui/primitives';
import { ChevronRightIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { getUserPositions } from '~/lib/career/queries/career-queries';
import { formatDateRange } from '~/lib/utils/dateRange';

import { logger } from '../lib/logger';
import { userContext } from '../lib/middleware';
import { Route } from './+types/work';

export const meta: Route.MetaFunction = () => [
  { title: 'Positions | career' },
  { name: 'description', content: 'Manage your work history and target positions.' },
];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  try {
    const positions = await getUserPositions(user.id);
    return { positions };
  } catch (error) {
    logger.error('Error loading positions', error, { owner_userid: user.id });
    throw new Response('Failed to load positions', { status: 500 });
  }
}

function filterPositions(positions: CareerPositionRecord[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return positions;
  return positions.filter((p) => {
    const company = (p.company ?? '').toLowerCase();
    const title = (p.title ?? '').toLowerCase();
    return company.includes(query) || title.includes(query);
  });
}

export default function WorkPage({ loaderData }: Route.ComponentProps) {
  const { positions } = loaderData;
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterPositions(positions, search), [positions, search]);

  const grouped = useMemo(() => {
    const employment = filtered.filter((p) => !(p.isTarget ?? false));
    const targets = filtered.filter((p) => p.isTarget ?? false);
    return { employment, targets };
  }, [filtered]);

  if (positions.length === 0) {
    return (
      <div>
        <SectionIntro title="Positions" description="Your work history and target roles." />
        <EmptyState
          icon="briefcase"
          title="No positions yet"
          description="Positions will appear here once data is migrated from your warehouse."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionIntro title="Positions" description="Your work history and target roles." />
      <div className="mt-4">
        <Input
          placeholder="Search positions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {grouped.employment.length > 0 && (
        <div className="mt-6">
          <h2 className="heading-3 mb-4">Work History</h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {grouped.employment.map((pos) => (
              <Link
                key={pos.id}
                to={`/work/${pos.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="heading-4 truncate">{pos.title}</p>
                  <p className="body-3 text-muted-foreground">{pos.company}</p>
                  <p className="footnote text-muted-foreground mt-1">
                    {formatDateRange(pos.startDate, pos.endDate)}
                    {pos.location && ` • ${pos.location}`}
                  </p>
                </div>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {grouped.targets.length > 0 && (
        <div className="mt-8">
          <h2 className="heading-3 mb-4">Target Companies</h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {grouped.targets.map((pos) => (
              <Link
                key={pos.id}
                to={`/work/${pos.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="heading-4 truncate">{pos.company}</p>
                  {pos.url && <p className="body-3 text-muted-foreground truncate">{pos.url}</p>}
                </div>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

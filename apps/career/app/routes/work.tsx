import type { CareerEngagementRecord } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { Input } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Button } from '@ponti-studios/ui/primitives';
import { BriefcaseIcon, PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { CareerList, CareerListRow } from '~/components/career/career-list';
import { getUserEngagements } from '~/lib/career/queries/career-queries';
import { formatDateRange } from '~/lib/utils/dateRange';

import { logger } from '../lib/logger';
import { userContext } from '../lib/middleware';
import { Route } from './+types/work';

export const meta: Route.MetaFunction = () => [
  { title: 'Positions | career' },
  { name: 'description', content: 'Manage your work history and engagements.' },
];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  try {
    const engagements = await getUserEngagements(user.id);
    return { engagements };
  } catch (error) {
    logger.error('Error loading engagements', error, { owner_userid: user.id });
    throw new Response('Failed to load engagements', { status: 500 });
  }
}

function filterPositions(positions: CareerEngagementRecord[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return positions;
  return positions.filter((p) => {
    const company = (p.company ?? '').toLowerCase();
    const title = (p.title ?? '').toLowerCase();
    return company.includes(query) || title.includes(query);
  });
}

export default function WorkPage({ loaderData }: Route.ComponentProps) {
  const { engagements: positions } = loaderData;
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterPositions(positions, search), [positions, search]);

  if (positions.length === 0) {
    return (
      <div>
        <SectionIntro
          title="Work history"
          description="Your work history and engagements."
          actions={
            <Button asChild variant="outline">
              <Link to="/work/new">
                <PlusIcon className="mr-2 size-4" />
                Add engagement
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={<BriefcaseIcon className="size-6" />}
          title="No engagements yet"
          description="Engagements will appear here once you add work history."
          className="mt-6"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/work/new">
                <PlusIcon className="mr-2 size-4" />
                Add engagement
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <SectionIntro
        title="Work history"
        description="Your work history and engagements."
        actions={
          <Button asChild variant="outline">
            <Link to="/work/new">
              <PlusIcon className="mr-2 size-4" />
              Add engagement
            </Link>
          </Button>
        }
      />
      <div className="mt-4">
        <Input
          placeholder="Search work history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length > 0 && (
        <div className="mt-6">
          <h2 className="heading-3 mb-4">Work History</h2>
          <CareerList>
            {filtered.map((pos) => (
              <CareerListRow
                key={pos.id}
                to={`/work/${pos.id}`}
                title={pos.title}
                subtitle={pos.company}
                meta={
                  <span className="footnote text-muted-foreground">
                    {formatDateRange(pos.startDate, pos.endDate)}
                    {pos.location && ` • ${pos.location}`}
                  </span>
                }
              />
            ))}
          </CareerList>
        </div>
      )}
    </div>
  );
}

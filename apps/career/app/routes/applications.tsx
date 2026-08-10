import { EmptyState } from '@ponti-studios/ui/feedback';
import { FilterChip } from '@ponti-studios/ui/filters';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Button } from '@ponti-studios/ui/primitives';
import { FolderIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';

import { ApplicationsFilters } from '~/components/career/applications/ApplicationsFilters';
import { CareerList, CareerListRow } from '~/components/career/career-list';
import { StatusBadge } from '~/components/status-badge';
import {
  filterJobApplications,
  paginateJobApplications,
  sortJobApplications,
} from '~/lib/career/queries/job-applications';
import { getApplicationCards } from '~/lib/career/queries/job-applications.server';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { formatApplicationDate } from '~/lib/utils/applicationUtils';
import { getApplicationStatusTone } from '~/lib/utils/applicationUtils';

import { Route } from './+types/applications';

export const meta: Route.MetaFunction = () => [
  { title: 'Applications | career' },
  { name: 'description', content: 'Track and manage your job applications in one place.' },
];

const PAGE_SIZE = 15;

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  try {
    const cards = await getApplicationCards(user.id);
    return { applications: cards };
  } catch (error) {
    logger.error('Error loading applications', error, { owner_userid: user.id });
    return { applications: [] };
  }
}

export default function ApplicationsRoute({ loaderData }: Route.ComponentProps) {
  const { applications } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get('status') || '';
  const sourceFilter = searchParams.get('source') || '';
  const query = searchParams.get('query') || '';
  const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      const key = app.status ?? '(none)';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: `${value} (${count})` }));
  }, [applications]);

  const sourceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      const key = app.source ?? '(none)';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: `${value} (${count})` }));
  }, [applications]);

  const filtered = useMemo(() => {
    const base = filterJobApplications(applications, {
      status: statusFilter || undefined,
      source: sourceFilter || undefined,
      query: query || undefined,
    });
    return sortJobApplications(base, sort);
  }, [applications, statusFilter, sourceFilter, query, sort]);

  const {
    items,
    total,
    totalPages,
    page: currentPage,
  } = useMemo(
    () => paginateJobApplications(filtered, { page, pageSize: PAGE_SIZE }),
    [filtered, page],
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('page');
    setSearchParams(next, { preventScrollReset: true });
  };

  const toggleSort = () => setParam('sort', sort === 'desc' ? 'asc' : 'desc');

  const clearParams = (keys: string[]) => {
    const next = new URLSearchParams(searchParams);
    for (const key of keys) {
      next.delete(key);
    }
    next.delete('page');
    setSearchParams(next, { preventScrollReset: true });
  };

  const pageStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div>
      <SectionIntro
        title="Applications"
        description={`${total} applications in your pipeline.`}
        actions={
          <Button asChild variant="outline">
            <Link to="/applications/new">
              <PlusIcon className="mr-2 size-4" />
              Add application
            </Link>
          </Button>
        }
      />

      {applications.length > 0 && (
        <div className="mt-6">
          <ApplicationsFilters
            searchValue={query}
            onSearchChange={(v) => setParam('query', v)}
            statusOptions={statusOptions}
            selectedStatus={statusFilter}
            onStatusChange={(v) => setParam('status', v)}
            sourceOptions={sourceOptions}
            selectedSource={sourceFilter}
            onSourceChange={(v) => setParam('source', v)}
            onClearFilters={() => clearParams(['status', 'source', 'query'])}
            sortChip={
              <FilterChip
                label={sort === 'desc' ? 'Newest first' : 'Oldest first'}
                onClick={toggleSort}
                onRemove={() => setParam('sort', '')}
                variant="sort"
                direction={sort}
                role="button"
              />
            }
            pagination={{
              currentPage: currentPage - 1,
              totalPages,
              onPageChange: (p) => setParam('page', String(p + 1)),
            }}
          />
        </div>
      )}

      {applications.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="size-6" />}
          title="No applications yet"
          description="Applications will appear here once data is migrated from your warehouse."
          className="mt-6"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="size-6" />}
          title="No matching applications"
          description="Try adjusting your filters or search."
          className="mt-6"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => clearParams(['status', 'source', 'query', 'sort'])}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <CareerList className="mt-6">
            {items.map((app) => (
              <CareerListRow
                key={app.id}
                to={`/applications/${app.id}`}
                title={app.title}
                subtitle={app.company}
                meta={
                  <span className="footnote text-muted-foreground">
                    {app.appliedAt && formatApplicationDate(app.appliedAt)}
                    {app.source && ` · ${app.source}`}
                    {app.stageCount > 0 && ` · ${app.stageCount} stages`}
                  </span>
                }
                trailing={
                  <div className="flex items-center gap-1.5">
                    {app.status && (
                      <StatusBadge tone={getApplicationStatusTone(app.status)} label={app.status} />
                    )}
                    {app.hasOffer && <StatusBadge tone="success" label="Offer" />}
                  </div>
                }
              />
            ))}
          </CareerList>

          <p className="footnote text-muted-foreground mt-4">
            Showing {pageStart}–{pageEnd} of {total}
          </p>
        </>
      )}
    </div>
  );
}

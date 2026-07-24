import { db, JobApplicationRepository } from '@hominem/db';
import { useDebouncedValue } from '@ponti-studios/ui/hooks';
import { Button } from '@ponti-studios/ui/primitives';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { ApplicationsEmptyState } from '~/components/career/applications/ApplicationsEmptyState';
import { ApplicationsFilters } from '~/components/career/applications/ApplicationsFilters';
import { ApplicationsList } from '~/components/career/applications/ApplicationsList';
import { PageHeader } from '~/components/patterns';
import {
  filterJobApplications,
  getApplicationCards,
  sortAndPaginateJobApplications,
} from '~/lib/career/queries/job-applications';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { buildApplicationsSearchParams } from '~/lib/utils/applicationsSearchParams';
import {
  getUniqueSources,
  getUniqueStatuses,
  hasActiveFilters,
} from '~/lib/utils/applicationUtils';

import { Route } from './+types/applications';

export const meta: Route.MetaFunction = () => [
  { title: 'Applications | career' },
  { name: 'description', content: 'Track and manage your job applications in one place.' },
];

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function loader({ context, request }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Extract pagination and filter parameters
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(
      1,
      Math.min(MAX_LIMIT, Number.parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT))),
    );
    const offset = (page - 1) * limit;

    const searchQuery = searchParams.get('search') || undefined;
    const selectedStatus = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;

    // Build filter object
    const filter = {
      ...(selectedStatus && { status: selectedStatus }),
      ...(source && source !== 'ALL' && { source }),
      ...(searchQuery && { search: searchQuery }),
    };

    // Build pagination object
    const pagination = {
      limit,
      offset,
      orderBy: (searchParams.get('orderBy') || 'applicationDate') as
        | 'applicationDate'
        | 'companyName'
        | 'position',
      orderDirection: (searchParams.get('orderDirection') as 'asc' | 'desc') || 'desc',
    };

    const allApplications = await getApplicationCards(user.id);
    const filteredApplications = filter
      ? filterJobApplications(allApplications, filter)
      : allApplications;
    const paginatedApplications = sortAndPaginateJobApplications(filteredApplications, pagination);

    return {
      user,
      allApplications,
      applications: paginatedApplications,
      pagination: {
        page,
        limit,
        total: filteredApplications.length,
        totalPages: Math.ceil(filteredApplications.length / limit),
      },
      filters: {
        search: searchQuery,
        status: selectedStatus,
        source: source && source !== 'ALL' ? source : undefined,
      },
    };
  } catch (error) {
    logger.error('Error loading job applications data', error, { owner_userid: user.id });
    throw new Response('Failed to load job applications data', { status: 500 });
  }
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  try {
    const formData = await request.formData();
    const operation = formData.get('operation');

    if (typeof operation !== 'string') {
      throw new Response('Invalid operation', { status: 400 });
    }

    if (operation === 'update') {
      const applicationId = formData.get('applicationId');
      const status = formData.get('status');

      if (typeof applicationId !== 'string' || typeof status !== 'string') {
        throw new Response('Missing or invalid applicationId or status', { status: 400 });
      }

      await JobApplicationRepository.updateJobApplicationStatus(db, {
        ownerUserid: user.id,
        applicationId,
        status,
      });

      return { message: 'Job application updated successfully' };
    }

    if (operation === 'delete') {
      const applicationId = formData.get('applicationId');

      if (typeof applicationId !== 'string') {
        throw new Response('Missing or invalid applicationId', { status: 400 });
      }

      await JobApplicationRepository.deleteJobApplication(db, {
        ownerUserid: user.id,
        applicationId,
      });

      return { message: 'Job application deleted successfully' };
    }

    throw new Response('Invalid operation', { status: 400 });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Error in job applications action', error, { owner_userid: user.id });
    throw new Response('Failed to process job application request', { status: 500 });
  }
}

export default function Applications({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchValueFromRoute = loaderData.filters.search || '';
  const [searchValue, setSearchValue] = useState(searchValueFromRoute);
  const debouncedSearchValue = useDebouncedValue(searchValue, 500);

  const { allApplications, applications, pagination, filters: initialFilters } = loaderData;
  const filters = {
    ...initialFilters,
    status: initialFilters.status ?? '',
    source: initialFilters.source ?? '',
  };
  const statuses = getUniqueStatuses(allApplications);
  const sourceOptions = getUniqueSources(allApplications).map((source) => ({
    value: source,
    label: source || 'Unknown',
  }));
  const hasFilters = hasActiveFilters(filters);

  const updateSearchParams = (updates: Record<string, string | string[] | null>) => {
    const nextSearchParams = buildApplicationsSearchParams(searchParams, updates);
    const queryString = nextSearchParams.toString();
    navigate(queryString ? `?${queryString}` : '.');
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (value === '') {
      updateSearchParams({ search: null, page: '1' });
    }
  };

  const handleStatusChange = (status: string) => {
    updateSearchParams({ status: status || null, page: '1' });
  };

  const handleSourceChange = (source: string) => {
    updateSearchParams({ source: source || null, page: '1' });
  };

  const clearFilters = () => {
    setSearchValue('');
    updateSearchParams({ search: null, status: null, source: null, page: '1' });
  };

  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    if (debouncedSearchValue === (filters.search || '') || debouncedSearchValue === '') {
      return;
    }
    updateSearchParams({ search: debouncedSearchValue, page: '1' });
  }, [debouncedSearchValue, filters.search]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Job Applications">
        <Button
          type="button"
          onClick={() => navigate('/applications/new')}
          variant="default"
          size="icon"
          aria-label="Add application"
        >
          <PlusIcon className="size-4" />
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <ApplicationsFilters
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          statuses={statuses}
          selectedStatus={filters.status}
          onStatusChange={handleStatusChange}
          sourceOptions={sourceOptions}
          selectedSource={filters.source}
          onSourceChange={handleSourceChange}
          onClearFilters={clearFilters}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            onPrevPage: () => updateSearchParams({ page: String(pagination.page - 1) }),
            onNextPage: () => updateSearchParams({ page: String(pagination.page + 1) }),
          }}
        />

        {applications.length === 0 ? (
          <ApplicationsEmptyState
            kind={hasFilters ? 'filtered' : 'base'}
            emptyTitle={hasFilters ? 'No applications match your filters' : 'No applications found'}
            emptyDescription={
              hasFilters
                ? 'Try adjusting your search criteria'
                : 'Start tracking your job applications to see them here'
            }
          />
        ) : (
          <ApplicationsList applications={applications} />
        )}
      </div>
    </section>
  );
}

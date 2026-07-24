import type { ProjectRecord as Project, WorkExperienceRecord as WorkExperience } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { Button } from '@ponti-studios/ui/primitives';
import { ChevronRightIcon, PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import {
  EntityListCards,
  EntityListTable,
  FilterSelect,
  PageHeader,
  SearchFilterBar,
  StatusBadge,
  type EntityListColumn,
  type StatusTone,
} from '~/components/patterns';
import { RouterListLink } from '~/components/RouterListLink';
import { getUserWorkExperiencesDesc } from '~/lib/career/queries/base';
import { getProjectsByPortfolio } from '~/lib/career/queries/projects';
import { portfolioContext, userContext } from '~/lib/middleware';
import { humanizeIdentifier } from '@hominem/utils/text';
import { formatDateRange } from '~/lib/utils/dateRange';

import { Route } from './+types/projects';

export const meta: Route.MetaFunction = () => [{ title: 'Projects | career' }];

export interface ProjectClientOption {
  id: string;
  company: string;
  role: string;
}

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return '—';
  return humanizeIdentifier(status);
}

const PROJECT_STATUS_TONE: Record<string, StatusTone> = {
  'in-progress': 'warning',
  completed: 'success',
  archived: 'neutral',
};

function getProjectStatusTone(status: string | null | undefined): StatusTone {
  return (status && PROJECT_STATUS_TONE[status]) || 'neutral';
}

const STATUS_SORT_PRIORITY: Record<string, number> = {
  'in-progress': 0,
  completed: 1,
  archived: 2,
};

function getStatusSortPriority(status: string | null | undefined) {
  if (!status) return 99;
  return STATUS_SORT_PRIORITY[status] ?? 98;
}

function getTimelineSortValue(project: Project) {
  return project.startDate ? new Date(project.startDate).getTime() : -Infinity;
}

export function sortProjectsByStatusAndTimeline(projects: Project[]): Project[] {
  return [...projects].sort((left, right) => {
    const statusDiff = getStatusSortPriority(left.status) - getStatusSortPriority(right.status);
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return getTimelineSortValue(right) - getTimelineSortValue(left);
  });
}

export function buildProjectClientOptions(
  workExperiences: WorkExperience[],
): ProjectClientOption[] {
  return [...workExperiences]
    .sort((left, right) => (left.company || '').localeCompare(right.company || ''))
    .map((workExperience) => ({
      id: workExperience.id,
      company: workExperience.company?.trim() || 'Untitled client',
      role: workExperience.role?.trim() || '',
    }));
}

export function filterProjectsByClient(projects: Project[], selectedClientId?: string | null) {
  if (!selectedClientId) {
    return projects;
  }

  return projects.filter((project) => project.workExperienceId === selectedClientId);
}

export function filterProjectsBySearch(
  projects: Project[],
  search: string,
  clientLabelFor: (project: Project) => string,
) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return projects;
  }

  return projects.filter((project) => {
    const title = project.title?.trim().toLowerCase() || '';
    const client = clientLabelFor(project).toLowerCase();
    return title.includes(query) || client.includes(query);
  });
}

export default function Projects({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState('');
  const selectedClientId = searchParams.get('client') || '';

  const clientOptions = useMemo(
    () => buildProjectClientOptions(loaderData.workExperiences),
    [loaderData.workExperiences],
  );
  const clientsById = useMemo(
    () =>
      new Map(clientOptions.map((workExperience) => [workExperience.id, workExperience.company])),
    [clientOptions],
  );

  const clientLabelFor = (project: Project) =>
    clientsById.get(project.workExperienceId || '') || 'Unlinked project';

  const filteredProjects = useMemo(() => {
    const byClient = filterProjectsByClient(loaderData.projects, selectedClientId || null);
    const bySearch = filterProjectsBySearch(byClient, searchValue, clientLabelFor);
    return sortProjectsByStatusAndTimeline(bySearch);
  }, [loaderData.projects, selectedClientId, searchValue, clientsById]);

  const hasFilters = Boolean(searchValue.trim() || selectedClientId);
  const currentSearch = searchParams.toString();
  const newProjectHref = currentSearch ? `/projects/new?${currentSearch}` : '/projects/new';

  const hrefFor = (project: Project) =>
    currentSearch ? `/projects/${project.id}?${currentSearch}` : `/projects/${project.id}`;

  const handleClientChange = (clientId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (clientId) {
      nextParams.set('client', clientId);
    } else {
      nextParams.delete('client');
    }
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setSearchValue('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('client');
    setSearchParams(nextParams);
  };

  const activeFilters = [
    ...(searchValue.trim()
      ? [
          {
            id: 'search',
            label: `Search: ${searchValue.trim()}`,
            onRemove: () => setSearchValue(''),
          },
        ]
      : []),
    ...(selectedClientId
      ? [
          {
            id: 'client',
            label: `Client: ${clientOptions.find((option) => option.id === selectedClientId)?.company || 'Selected'}`,
            onRemove: () => handleClientChange(''),
          },
        ]
      : []),
  ];

  const columns: EntityListColumn<Project>[] = [
    {
      key: 'title',
      header: 'Project',
      width: 'minmax(0,1.5fr)',
      render: (project) => (
        <p className="body-2 truncate text-text-primary">
          {project.title?.trim() || 'Untitled project'}
        </p>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      width: 'minmax(0,1fr)',
      render: (project) => (
        <p className="body-2 truncate text-text-secondary">{clientLabelFor(project)}</p>
      ),
    },
    {
      key: 'timeline',
      header: 'Timeline',
      width: 'minmax(0,0.9fr)',
      render: (project) => (
        <p className="body-4 whitespace-nowrap text-text-tertiary">
          {formatDateRange(project.startDate, project.endDate)}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'minmax(0,0.7fr)',
      render: (project) => (
        <StatusBadge
          tone={getProjectStatusTone(project.status)}
          label={formatStatusLabel(project.status)}
        />
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Projects">
        <Button
          type="button"
          onClick={() => navigate(newProjectHref)}
          variant="default"
          size="icon"
          aria-label="Add project"
        >
          <PlusIcon className="size-4" />
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <SearchFilterBar activeFilters={activeFilters} onClear={clearFilters}>
          <SearchFilterBar.Search
            id="project-search"
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search by project or client..."
            ariaLabel="Search projects"
          />
          <SearchFilterBar.Filters>
            <FilterSelect
              value={selectedClientId}
              options={clientOptions.map((option) => ({
                value: option.id,
                label: option.company,
              }))}
              onChange={handleClientChange}
              placeholder="All clients"
              id="project-client-filter"
            />
          </SearchFilterBar.Filters>
        </SearchFilterBar>

        {filteredProjects.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No projects match your filters' : 'No projects found'}
            description={
              hasFilters
                ? 'Try adjusting your search or client filter'
                : 'Add launches, case studies, and shipped work to edit them from a dedicated project page'
            }
            variant={hasFilters ? 'search' : 'dashed'}
            size={hasFilters ? 'md' : undefined}
          />
        ) : (
          <>
            <EntityListTable
              items={filteredProjects}
              columns={columns}
              keyFor={(project) => project.id}
              hrefFor={hrefFor}
              linkComponent={RouterListLink}
            />
            <EntityListCards
              items={filteredProjects}
              keyFor={(project) => project.id}
              hrefFor={hrefFor}
              linkComponent={RouterListLink}
              renderCard={(project) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="body-2 truncate text-text-primary">
                      {project.title?.trim() || 'Untitled project'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="body-4 truncate text-text-secondary">
                        {clientLabelFor(project)}
                      </p>
                      <span className="body-4 text-text-tertiary">·</span>
                      <p className="body-4 text-text-tertiary">
                        {formatDateRange(project.startDate, project.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <StatusBadge
                      tone={getProjectStatusTone(project.status)}
                      label={formatStatusLabel(project.status)}
                    />
                    <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                </div>
              )}
            />
          </>
        )}
      </div>
    </section>
  );
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  const portfolio = context.get(portfolioContext)!;
  const [projects, workExperiences] = await Promise.all([
    getProjectsByPortfolio(portfolio.id),
    getUserWorkExperiencesDesc(user.id),
  ]);

  return { projects, workExperiences };
}

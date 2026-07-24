import type { WorkExperienceRecord as WorkExperience } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { Button } from '@ponti-studios/ui/primitives';
import { ChevronRightIcon, PlusIcon, UploadIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFetcher, useNavigate, useRevalidator } from 'react-router';

import {
  EntityListCards,
  EntityListTable,
  PageHeader,
  SearchFilterBar,
  type EntityListColumn,
} from '~/components/patterns';
import { RouterListLink } from '~/components/RouterListLink';
import { UploadResumeForm } from '~/components/UploadResumeForm';
import { getUserWorkExperiencesDesc } from '~/lib/career/queries/base';
import {
  handleWorkExperienceCreateAction,
  type WorkExperienceCreateValues,
} from '~/lib/career/work-actions';
import { formatDateRange } from '~/lib/utils/dateRange';

import { FormErrorAlert } from '../components/FormErrorAlert';
import { useCareerEditorSubmission } from '../hooks/useCareerEditorSubmission';
import { portfolioContext, userContext } from '../lib/middleware';
import { Route } from './+types/work';

export const meta: Route.MetaFunction = () => [
  { title: 'Work Experience | career' },
  { name: 'description', content: 'Manage your work history and professional experience.' },
];

export function filterWorkExperiencesBySearch(experiences: WorkExperience[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return experiences;
  }

  return experiences.filter((experience) => {
    const company = experience.company?.trim().toLowerCase() || '';
    const role = experience.role?.trim().toLowerCase() || '';
    return company.includes(query) || role.includes(query);
  });
}

const WORK_COLUMNS: EntityListColumn<WorkExperience>[] = [
  {
    key: 'company',
    header: 'Company',
    width: 'minmax(0,1.1fr)',
    render: (experience) => (
      <p className="body-2 truncate text-text-primary">
        {experience.company?.trim() || 'Untitled client'}
      </p>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    width: 'minmax(0,1fr)',
    render: (experience) => (
      <p className="body-2 truncate text-text-secondary">
        {experience.role?.trim() || 'Untitled role'}
      </p>
    ),
  },
  {
    key: 'timeline',
    header: 'Timeline',
    width: 'minmax(0,0.9fr)',
    render: (experience) => (
      <p className="body-4 whitespace-nowrap text-text-tertiary">
        {formatDateRange(experience.startDate, experience.endDate)}
      </p>
    ),
  },
];

function renderWorkCard(experience: WorkExperience) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="body-2 truncate text-text-primary">
          {experience.company?.trim() || 'Untitled client'}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="body-4 truncate text-text-secondary">
            {experience.role?.trim() || 'Untitled role'}
          </p>
          <span className="body-4 text-text-tertiary">·</span>
          <p className="body-4 text-text-tertiary">
            {formatDateRange(experience.startDate, experience.endDate)}
          </p>
        </div>
      </div>
      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

export default function Work({ loaderData }: Route.ComponentProps) {
  const draftFetcher = useFetcher();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { work_experiences, portfolioId } = loaderData;
  const experiences = work_experiences || [];
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredExperiences = useMemo(
    () => filterWorkExperiencesBySearch(experiences, searchValue),
    [experiences, searchValue],
  );

  const { submissionError, clearSubmissionError } = useCareerEditorSubmission<WorkExperience>({
    fetcher: draftFetcher,
    errorMessage: 'We couldn’t create a new work experience. Try again.',
    onSuccess: (result) => {
      if (!result.data) {
        return;
      }

      navigate(`/work/${result.data.id}`);
    },
  });

  const handleAddNew = () => {
    const formData = new FormData();
    formData.append('operation', 'create');
    formData.append(
      'workExperienceData',
      JSON.stringify({
        role: '',
        company: '',
        description: '',
        startDate: '',
        endDate: '',
        achievements: [],
        metadata: {},
        sortOrder: experiences.length,
        isVisible: true,
        portfolioId,
      } satisfies WorkExperienceCreateValues),
    );

    clearSubmissionError();
    draftFetcher.submit(formData, {
      method: 'POST',
      action: '/work',
    });
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Work Experience">
        <Button
          type="button"
          onClick={handleAddNew}
          variant="default"
          size="icon"
          disabled={draftFetcher.state === 'submitting'}
          aria-label="Add new experience"
        >
          <PlusIcon className="size-4" />
        </Button>
      </PageHeader>

      <FormErrorAlert title="Work experience wasn’t created" message={submissionError} />

      <div className="flex flex-col gap-6">
        {experiences.length > 0 ? (
          <>
            <SearchFilterBar
              activeFilters={
                searchValue.trim()
                  ? [
                      {
                        id: 'search',
                        label: `Search: ${searchValue.trim()}`,
                        onRemove: () => setSearchValue(''),
                      },
                    ]
                  : []
              }
              onClear={() => setSearchValue('')}
            >
              <SearchFilterBar.Search
                id="work-search"
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Search by company or role..."
                ariaLabel="Search work experience"
              />
            </SearchFilterBar>

            {filteredExperiences.length === 0 ? (
              <EmptyState
                title="No experience matches your search"
                description="Try adjusting your search"
                variant="search"
                size="md"
              />
            ) : (
              <>
                <EntityListTable
                  items={filteredExperiences}
                  columns={WORK_COLUMNS}
                  keyFor={(experience) => experience.id}
                  hrefFor={(experience) => `/work/${experience.id}`}
                  linkComponent={RouterListLink}
                />
                <EntityListCards
                  items={filteredExperiences}
                  keyFor={(experience) => experience.id}
                  hrefFor={(experience) => `/work/${experience.id}`}
                  linkComponent={RouterListLink}
                  renderCard={renderWorkCard}
                />
              </>
            )}
          </>
        ) : showResumeUpload ? (
          <div className="mx-auto flex w-full max-w-md flex-col gap-4">
            <UploadResumeForm
              mode="replace"
              showHeading
              onUploadStart={() => undefined}
              onUploadComplete={() => {
                setShowResumeUpload(false);
                revalidator.revalidate();
              }}
              onUploadError={() => undefined}
            />
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowResumeUpload(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <EmptyState
            title="Build your foundation"
            description="Upload a resume to extract roles automatically, or add your first role by hand."
            variant="dashed"
            action={
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={() => setShowResumeUpload(true)}>
                  <UploadIcon className="size-4" />
                  Upload resume
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddNew}
                  disabled={draftFetcher.state === 'submitting'}
                  isLoading={draftFetcher.state === 'submitting'}
                  loadingLabel="Creating…"
                >
                  <PlusIcon className="size-4" />
                  Add a role
                </Button>
              </div>
            }
          />
        )}
      </div>
    </section>
  );
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  const portfolio = context.get(portfolioContext)!;
  const work_experiences = await getUserWorkExperiencesDesc(user.id);
  return { work_experiences, portfolioId: portfolio.id };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) {
    return { success: false, error: 'Sign in again before saving your work experience.' };
  }

  return handleWorkExperienceCreateAction(request, user.id);
}

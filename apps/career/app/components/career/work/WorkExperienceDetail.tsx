import type { WorkExperienceRecord } from '@hominem/db';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ponti-studios/ui/overlays';
import { Button } from '@ponti-studios/ui/primitives';
import { ArrowLeftIcon, TrashIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useFetcher, useNavigate } from 'react-router';

import { FormErrorAlert } from '~/components/FormErrorAlert';
import { useCareerEditorSubmission } from '~/hooks/useCareerEditorSubmission';
import { submitDelete } from '~/hooks/useWorkExperienceSection';
import type { WorkExperienceMetadata } from '~/lib/career/queries/career-progression';
import { formatDateRange, formatOptionalLabel } from '~/lib/career/work-experience-form';
import { jsonObject } from '~/lib/db-json';

import { AchievementsSection } from './AchievementsSection';
import { CompensationSection } from './CompensationSection';
import { ExitSection } from './ExitSection';
import { OverviewSection } from './OverviewSection';
import { ProjectsSection } from './ProjectsSection';
import { TeamSection } from './TeamSection';
import { TechnologiesSection } from './TechnologiesSection';

export function WorkExperienceDetail({
  workExperience,
  linkedProjectCount,
}: {
  workExperience: WorkExperienceRecord;
  linkedProjectCount: number;
}) {
  const navigate = useNavigate();
  const metadata = useMemo(
    () => jsonObject<WorkExperienceMetadata>(workExperience.metadata) ?? {},
    [workExperience.metadata],
  );

  const deleteFetcher = useFetcher();
  const { submissionError, clearSubmissionError } = useCareerEditorSubmission({
    fetcher: deleteFetcher,
    errorMessage: 'We couldn’t delete this work experience. Try again.',
    onSuccess: (result) => {
      if (result.operation === 'delete') {
        navigate('/work');
      }
    },
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/work')}
        data-testid="back-button"
        className="body-3 inline-flex items-center gap-2 self-start text-muted-foreground transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Back to work
      </button>

      <FormErrorAlert title="Work experience wasn’t deleted" message={submissionError} />

      <section className="border-b pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="space-y-1">
              <h1 className="heading-2 text-foreground">
                {workExperience.role || 'Untitled role'}
              </h1>
              <p className="body-2 text-muted-foreground">
                {workExperience.company || 'Add the company name in Overview'}
              </p>
            </div>

            <div className="body-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
              <span>{formatDateRange(workExperience.startDate, workExperience.endDate)}</span>
              {workExperience.employmentType ? (
                <>
                  <span className="text-border">·</span>
                  <span>{formatOptionalLabel(workExperience.employmentType)}</span>
                </>
              ) : null}
              {workExperience.workArrangement ? (
                <>
                  <span className="text-border">·</span>
                  <span>{formatOptionalLabel(workExperience.workArrangement)}</span>
                </>
              ) : null}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="self-start shrink-0 lg:self-auto"
                >
                  <TrashIcon className="size-4" />
                  <span className="hidden sm:inline">Delete experience</span>
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this work experience?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the role from your portfolio and unlinks any details kept here.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => submitDelete(deleteFetcher, clearSubmissionError, workExperience)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <div className="grid gap-4">
        <OverviewSection workExperience={workExperience} metadata={metadata} />
        <AchievementsSection achievements={metadata.achievements ?? []} />
        <TechnologiesSection technologies={metadata.technologies ?? []} />
        <ProjectsSection
          linkedProjectCount={linkedProjectCount}
          onOpen={() => navigate(`/projects?client=${workExperience.id}`)}
          companyName={workExperience.company || 'this client'}
        />
        <CompensationSection workExperience={workExperience} />
        <TeamSection workExperience={workExperience} />
        <ExitSection workExperience={workExperience} />
      </div>
    </div>
  );
}

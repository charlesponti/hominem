import { Button } from '@ponti-studios/ui/primitives';
import { BriefcaseBusinessIcon } from 'lucide-react';

import { SectionCard } from './section-ui';

export function ProjectsSection({
  linkedProjectCount,
  onOpen,
  companyName,
}: {
  linkedProjectCount: number;
  onOpen: () => void;
  companyName: string;
}) {
  return (
    <SectionCard
      title="Projects"
      action={
        <Button type="button" variant="outline" onClick={onOpen}>
          <BriefcaseBusinessIcon className="size-4" />
          View projects
        </Button>
      }
    >
      <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="body-2 text-foreground">
            {linkedProjectCount === 0
              ? 'No projects are linked to this role yet.'
              : `${linkedProjectCount} project${linkedProjectCount === 1 ? '' : 's'} linked to this role.`}
          </p>
          <p className="text-sm text-muted-foreground">
            Open the shared projects screen to manage launches, case studies, and shipped work for{' '}
            {companyName}. We’ll pre-apply the client filter for you.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

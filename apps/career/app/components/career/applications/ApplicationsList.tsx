import { replaceUnderscores } from '@hominem/utils/text';
import { ChevronRightIcon } from 'lucide-react';

import { StatusBadge } from '~/components/patterns';
import { RouterListLink } from '~/components/RouterListLink';
import type { JobApplicationCard } from '~/lib/career/queries/job-applications';
import {
  formatApplicationDate,
  getApplicationStatusTone,
  getCompanyName,
} from '~/lib/utils/applicationUtils';

function getInitial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

interface ApplicationsListProps {
  applications: JobApplicationCard[];
}

export function ApplicationsList({ applications }: ApplicationsListProps) {
  return (
    <div className="space-y-3">
      {applications.map((application) => {
        const companyName = getCompanyName(application.company);
        const statusTone = getApplicationStatusTone(application.status);

        return (
          <RouterListLink
            key={application.id}
            href={`/applications/${application.id}`}
            className="group block"
          >
            <article className="relative flex items-start gap-4 rounded-xl border border-border/50 bg-surface-raised p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-lg hover:shadow-black/5">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="body-2 truncate text-text-primary group-hover:text-accent transition-colors">
                      {application.position}
                    </h3>
                    <p className="body-4 mt-0.5 text-text-secondary">{companyName}</p>
                  </div>
                  <StatusBadge tone={statusTone} label={replaceUnderscores(application.status)} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-text-tertiary">
                  <span className="body-4">
                    Updated {formatApplicationDate(application.updatedat)}
                  </span>
                  {application.source && (
                    <>
                      <span className="size-1 rounded-full bg-border" />
                      <span className="body-4 capitalize">{application.source}</span>
                    </>
                  )}
                </div>
              </div>

              <ChevronRightIcon className="mt-2.5 size-4 shrink-0 text-border transition-colors group-hover:text-text-tertiary" />
            </article>
          </RouterListLink>
        );
      })}
    </div>
  );
}

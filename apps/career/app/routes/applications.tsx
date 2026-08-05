import { SectionIntro } from '@ponti-studios/ui/layout';
import { ChevronRightIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';

import { filterJobApplications, getApplicationCards } from '~/lib/career/queries/job-applications';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/applications';

export const meta: Route.MetaFunction = () => [
  { title: 'Applications | career' },
  { name: 'description', content: 'Track and manage your job applications in one place.' },
];

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
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || undefined;

  const filtered = useMemo(() => {
    let result = applications;
    if (statusFilter) {
      result = filterJobApplications(result, { status: statusFilter });
    }
    return result;
  }, [applications, statusFilter]);

  if (applications.length === 0) {
    return (
      <div>
        <SectionIntro title="Applications" description="Track your job application pipeline." />
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="heading-4 text-muted-foreground">No applications yet</p>
          <p className="body-3 text-muted-foreground mt-2">
            Applications will appear here once data is migrated from your warehouse.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionIntro
        title="Applications"
        description={`${applications.length} applications in your pipeline.`}
      />

      <div className="divide-y divide-border rounded-lg border border-border mt-6">
        {filtered.map((app) => (
          <Link
            key={app.id}
            to={`/applications/${app.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="heading-4 truncate">{app.title}</p>
              <p className="body-3 text-muted-foreground">{app.company}</p>
              <div className="flex gap-3 mt-1">
                {app.status && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {app.status}
                  </span>
                )}
                {app.appliedAt && (
                  <span className="footnote text-muted-foreground">{app.appliedAt}</span>
                )}
                {app.stageCount > 0 && (
                  <span className="footnote text-muted-foreground">{app.stageCount} stages</span>
                )}
                {app.hasOffer && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Offer
                  </span>
                )}
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}

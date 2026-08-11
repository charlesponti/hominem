import { CareerRepository, db, type CareerApplicationWithRelations } from '@hominem/db';
import { humanizeIdentifier } from '@hominem/utils/text';
import { Briefcase, Calendar, FileText, MapPin, PaperclipIcon, StickyNoteIcon } from 'lucide-react';
import { data, NavLink, Outlet, redirect } from 'react-router';

import { QuickActions } from '~/components/career/applications/QuickActions';
import { StatusBadge } from '~/components/status-badge';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { cn } from '~/lib/utils';
import { getApplicationStatusTone } from '~/lib/utils/applicationUtils';
import { isJobApplicationStatus } from '~/types/career';

import { Route } from './+types/applications.$id';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = matches[matches.length - 1]?.loaderData as
    | { application: CareerApplicationWithRelations }
    | undefined;
  const app = data?.application;
  return [{ title: app ? `${app.title} at ${app.company} | career` : 'Application | career' }];
};

export async function action({ context, params, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const { id } = params;
  if (!id) throw new Response('Application ID is required', { status: 400 });

  const application = await CareerRepository.getApplicationWithRelations(db, user.id, id);
  if (!application) throw new Response('Application not found', { status: 404 });

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'update-application') {
    const statusValue = formData.get('status');
    if (
      statusValue !== null &&
      (typeof statusValue !== 'string' ||
        (statusValue !== '' && !isJobApplicationStatus(statusValue)))
    ) {
      throw new Response('Invalid application status', { status: 400 });
    }
    const salaryRaw = formData.get('salaryExpectation') as string;
    const salaryExpectation =
      salaryRaw && Number.isFinite(Number(salaryRaw)) ? Math.round(Number(salaryRaw) * 100) : null;

    await CareerRepository.updateApplication(db, user.id, id, {
      title: formData.get('title') as string,
      company: formData.get('company') as string,
      location: (formData.get('location') as string) || null,
      source: (formData.get('source') as string) || null,
      appliedAt: (formData.get('appliedAt') as string) || null,
      status: statusValue || null,
      jobPostingUrl: (formData.get('jobPostingUrl') as string) || null,
      salaryExpectation,
      notes: (formData.get('notes') as string) || null,
    });
    return data({ ok: true });
  }

  if (intent === 'update-status') {
    const status = formData.get('status');
    if (typeof status === 'string' && isJobApplicationStatus(status)) {
      await CareerRepository.updateApplication(db, user.id, id, { status });
    } else {
      throw new Response('Invalid application status', { status: 400 });
    }
    return data({ ok: true });
  }

  if (intent === 'delete') {
    await CareerRepository.deleteApplication(db, user.id, id);
    return redirect('/applications');
  }

  return data({ ok: false });
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  const { id } = params;

  if (!id) {
    throw new Response('Application ID is required', { status: 400 });
  }

  try {
    const application = await CareerRepository.getApplicationWithRelations(db, user.id, id);
    if (!application) {
      throw new Response('Application not found', { status: 404 });
    }
    return { application };
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error('Error fetching application details', error, {
      applicationId: id,
      owner_userid: user.id,
    });
    throw new Response('Failed to fetch application details', { status: 500 });
  }
}

const tabItems = [
  { to: '.', label: 'Overview', icon: Briefcase, end: true },
  { to: 'timeline', label: 'Timeline', icon: Calendar, end: false },
  { to: 'notes', label: 'Notes', icon: StickyNoteIcon, end: false },
  { to: 'files', label: 'Files', icon: PaperclipIcon, end: false },
  { to: 'resume', label: 'Resume', icon: FileText, end: false },
] as const;

export default function ApplicationDetailLayout({ loaderData }: Route.ComponentProps) {
  const { application } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="heading-2 truncate text-foreground">{application.title}</h1>
          <p className="body-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground">
            <span className="font-medium text-foreground">{application.company}</span>
            {application.location && (
              <>
                <span aria-hidden className="text-muted-foreground/50">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {application.location}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {application.status && (
            <StatusBadge
              tone={getApplicationStatusTone(application.status)}
              label={humanizeIdentifier(application.status)}
            />
          )}
          {application.currentStage && <StatusBadge tone="info" label={application.currentStage} />}
          <QuickActions currentStatus={application.status} />
        </div>
      </div>

      <nav className="bg-surface border flex h-auto w-full items-center gap-1 rounded-full p-1">
        {tabItems.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'text-text-primary flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-all',
                isActive && 'bg-background text-card-foreground ring-border ring-1 ring-inset',
              )
            }
          >
            <tab.icon className="size-4 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-6">
        <Outlet context={application} />
      </div>
    </div>
  );
}

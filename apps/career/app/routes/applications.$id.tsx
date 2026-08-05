import { CareerRepository, db, type CareerApplicationWithRelations } from '@hominem/db';
import {
  ArrowLeftIcon,
  Briefcase,
  Calendar,
  MapPin,
  PaperclipIcon,
  StickyNoteIcon,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';

import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { cn } from '~/lib/utils';

import { Route } from './+types/applications.$id';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = matches[matches.length - 1]?.loaderData as
    | { application: CareerApplicationWithRelations }
    | undefined;
  const app = data?.application;
  return [{ title: app ? `${app.title} at ${app.company} | career` : 'Application | career' }];
};

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
] as const;

export default function ApplicationDetailLayout({ loaderData }: Route.ComponentProps) {
  const { application } = loaderData;
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/applications')}
        data-testid="back-button"
        className="body-3 inline-flex items-center gap-2 self-start text-muted-foreground transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Back to applications
      </button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="heading-2 text-foreground">{application.title}</h1>
          <div className="flex gap-2 body-3 text-muted-foreground">
            <p className="p-2 py-1 border rounded bg-surface">{application.company}</p>
            {application.location && (
              <p className="p-2 py-1 border rounded bg-surface flex items-center gap-1">
                <MapPin className="size-3" />
                {application.location}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {application.status && (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium">
              {application.status}
            </span>
          )}
          {application.currentStage && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              {application.currentStage}
            </span>
          )}
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
                isActive && 'bg-card text-card-foreground border-border/40 border',
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

import { CareerRepository, ProjectRepository, db } from '@hominem/db';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { redirect } from 'react-router';

import { ProjectEditor } from '~/components/career/projects/ProjectEditor';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/projects.new';

export const meta: Route.MetaFunction = () => [{ title: 'Add project | career' }];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  return { engagements: await CareerRepository.listEngagements(db, user.id, { limit: 100 }) };
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const formData = await request.formData();
  const title = (formData.get('title') as string)?.trim();
  if (!title) return { error: 'Title is required' };

  const technologiesRaw = (formData.get('technologies') as string) ?? '';
  const technologies = technologiesRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const engagementIds = formData
    .getAll('engagementIds')
    .filter((value): value is string => typeof value === 'string');

  await ProjectRepository.create(db, user.id, {
    title,
    organization: (formData.get('organization') as string) || null,
    description: (formData.get('description') as string) || null,
    shortDescription: (formData.get('shortDescription') as string) || null,
    liveUrl: (formData.get('liveUrl') as string) || null,
    githubUrl: (formData.get('githubUrl') as string) || null,
    startDate: (formData.get('startDate') as string) || null,
    endDate: (formData.get('endDate') as string) || null,
    status: ((formData.get('status') as string) || 'BACKLOG') as
      | 'BACKLOG'
      | 'IN_PROGRESS'
      | 'DONE'
      | 'CANCELED',
    technologies,
    engagementIds,
  });

  return redirect('/projects');
}

export default function NewProjectRoute({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <div className="max-w-2xl">
      <SectionIntro title="Add project" description="Add a side project or portfolio piece." />
      <div className="mt-6">
        <ProjectEditor engagements={loaderData.engagements} submitLabel="Add project" />
        {actionData?.error && (
          <p className="body-3 text-destructive-text mt-3">{actionData.error}</p>
        )}
      </div>
    </div>
  );
}

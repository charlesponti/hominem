import { CareerRepository, ProjectRepository, db } from '@hominem/db';
import { TextField, Textarea } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Button } from '@ponti-studios/ui/primitives';
import { redirect } from 'react-router';
import { Form } from 'react-router';

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

      <Form method="post" className="mt-6 flex flex-col gap-4">
        <TextField label="Title" name="title" required placeholder="Project name" />
        <TextField
          label="Organization"
          name="organization"
          placeholder="Optional company or client"
        />
        <TextField
          label="Short description"
          name="shortDescription"
          placeholder="One-line summary"
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="status">
          Status
          <select
            id="status"
            name="status"
            defaultValue="BACKLOG"
            className="rounded-md border border-border p-2"
          >
            <option value="BACKLOG">Backlog</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </label>
        {loaderData.engagements.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Related work engagements</legend>
            {loaderData.engagements.map((engagement) => (
              <label key={engagement.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="engagementIds" value={engagement.id} />
                {engagement.title} at {engagement.company}
              </label>
            ))}
          </fieldset>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-foreground text-sm font-medium">
            Description
          </label>
          <Textarea id="description" name="description" rows={4} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Live URL" name="liveUrl" placeholder="https://" />
          <TextField label="GitHub URL" name="githubUrl" placeholder="https://" />
        </div>
        <TextField
          label="Technologies"
          name="technologies"
          placeholder="TypeScript, React, PostgreSQL"
          helpText="Comma-separated"
        />
        {actionData?.error && <p className="body-3 text-destructive-text">{actionData.error}</p>}
        <div className="flex justify-end">
          <Button type="submit">Add project</Button>
        </div>
      </Form>
    </div>
  );
}

import { CareerRepository, ProjectRepository, db } from '@hominem/db';
import { TextField, Textarea } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { Form, redirect } from 'react-router';

import { userContext } from '~/lib/middleware';

import { Route } from './+types/projects.$id';

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.project.title} | career` : 'Project | career' },
];

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  const [projects, engagements] = await Promise.all([
    ProjectRepository.list(db, user.id),
    CareerRepository.listEngagements(db, user.id, { limit: 100 }),
  ]);
  const project = projects.find((p) => p.id === params.id);
  if (!project) throw new Response('Project not found', { status: 404 });
  return { project, engagements };
}

export async function action({ context, params, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    await ProjectRepository.remove(db, user.id, params.id);
    return redirect('/projects');
  }

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

  await ProjectRepository.update(db, user.id, params.id, {
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

  return { ok: true };
}

export default function ProjectDetailRoute({ loaderData }: Route.ComponentProps) {
  const { project } = loaderData;

  return (
    <div className="max-w-2xl">
      <Form method="post" className="flex flex-col gap-4">
        <TextField label="Title" name="title" required defaultValue={project.title} />
        <TextField
          label="Organization"
          name="organization"
          defaultValue={project.organization ?? ''}
        />
        <TextField
          label="Short description"
          name="shortDescription"
          defaultValue={project.shortDescription ?? ''}
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="status">
          Status
          <select
            id="status"
            name="status"
            defaultValue={project.status ?? 'BACKLOG'}
            className="rounded-md border border-border p-2"
          >
            <option value="BACKLOG">Backlog</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Related work engagements</legend>
          {loaderData.engagements.map((engagement) => (
            <label key={engagement.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="engagementIds"
                value={engagement.id}
                defaultChecked={project.engagements.some((item) => item.id === engagement.id)}
              />
              {engagement.title} at {engagement.company}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-foreground text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={project.description ?? ''}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Live URL" name="liveUrl" defaultValue={project.liveUrl ?? ''} />
          <TextField label="GitHub URL" name="githubUrl" defaultValue={project.githubUrl ?? ''} />
        </div>
        <TextField
          label="Technologies"
          name="technologies"
          helpText="Comma-separated"
          defaultValue={Array.isArray(project.technologies) ? project.technologies.join(', ') : ''}
        />
        <div className="flex justify-between">
          <Button type="submit" name="intent" value="delete" variant="ghost">
            Delete
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </Form>
    </div>
  );
}

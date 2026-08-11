import { ProjectRepository, db } from '@hominem/db';
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
  const projects = await ProjectRepository.list(db, user.id);
  const project = projects.find((p) => p.id === params.id);
  if (!project) throw new Response('Project not found', { status: 404 });
  return { project };
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

  await ProjectRepository.update(db, user.id, params.id, {
    title,
    description: (formData.get('description') as string) || null,
    shortDescription: (formData.get('shortDescription') as string) || null,
    liveUrl: (formData.get('liveUrl') as string) || null,
    githubUrl: (formData.get('githubUrl') as string) || null,
    technologies,
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
          label="Short description"
          name="shortDescription"
          defaultValue={project.shortDescription ?? ''}
        />
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

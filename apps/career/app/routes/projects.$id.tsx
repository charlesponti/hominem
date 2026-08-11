import { CareerRepository, ProjectRepository, db } from '@hominem/db';
import { Button } from '@ponti-studios/ui/primitives';
import { ArrowLeftIcon, CodeIcon, ExternalLinkIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Form, Link, redirect } from 'react-router';

import { CareerList, CareerListRow } from '~/components/career/career-list';
import { ProjectEditor } from '~/components/career/projects/ProjectEditor';
import { StatusBadge } from '~/components/status-badge';
import { userContext } from '~/lib/middleware';
import { formatDateRange } from '~/lib/utils/dateRange';
import { formatProjectStatus, getProjectStatusTone } from '~/lib/utils/projectUtils';

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

  return { ok: true };
}

const cardClass = 'rounded-xl border border-border bg-card p-6';

export default function ProjectDetailRoute({ loaderData }: Route.ComponentProps) {
  const { project, engagements } = loaderData;
  const [isEditing, setIsEditing] = useState(false);
  const technologies = Array.isArray(project.technologies) ? project.technologies : [];

  if (isEditing) {
    return (
      <div>
        <Link
          to="/projects"
          className="footnote mb-4 inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Projects
        </Link>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="heading-2">Edit project</h1>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
        <div className={cardClass}>
          <ProjectEditor
            project={project}
            engagements={engagements}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/projects"
        className="footnote mb-4 inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Projects
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="heading-1">{project.title}</h1>
            {project.organization && (
              <p className="heading-4 mt-1 text-muted-foreground">{project.organization}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <PencilIcon className="mr-2 size-4" />
              Edit
            </Button>
            <Form
              method="post"
              navigate={false}
              onSubmit={(e) => {
                if (!confirm(`Delete "${project.title}"?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="intent" value="delete" />
              <Button type="submit" variant="outline" size="sm">
                <Trash2Icon className="mr-2 size-4" />
                Delete
              </Button>
            </Form>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {project.status && (
            <StatusBadge
              tone={getProjectStatusTone(project.status)}
              label={formatProjectStatus(project.status)}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {(project.startDate || project.endDate || project.shortDescription) && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-4 text-muted-foreground">Details</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DetailField label="Summary" value={project.shortDescription} />
              {(project.startDate || project.endDate) && (
                <DetailField
                  label="Timeline"
                  value={formatDateRange(project.startDate, project.endDate)}
                  mono
                />
              )}
            </div>
          </section>
        )}

        {project.description && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-3 text-muted-foreground">Description</h2>
            <p className="body-2 whitespace-pre-wrap text-foreground">{project.description}</p>
          </section>
        )}

        {technologies.length > 0 && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-3 text-muted-foreground">Technologies</h2>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <StatusBadge key={String(tech)} tone="neutral" label={String(tech)} />
              ))}
            </div>
          </section>
        )}

        {project.engagements.length > 0 && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-3 text-muted-foreground">Related work</h2>
            <CareerList>
              {project.engagements.map((engagement) => (
                <CareerListRow
                  key={engagement.id}
                  to={`/work/${engagement.id}`}
                  title={engagement.title}
                  subtitle={engagement.company}
                />
              ))}
            </CareerList>
          </section>
        )}

        {(project.liveUrl || project.githubUrl) && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-3 text-muted-foreground">Links</h2>
            <div className="flex flex-col gap-2">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="body-3 inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  {project.liveUrl}
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="body-3 inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <CodeIcon className="size-3.5" />
                  {project.githubUrl}
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="footnote text-muted-foreground">{label}</p>
      <p className={mono ? 'body-3 font-mono text-foreground' : 'body-3 text-foreground'}>
        {value}
      </p>
    </div>
  );
}

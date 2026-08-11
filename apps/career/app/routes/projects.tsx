import { ProjectRepository, db, type CareerProjectRecord } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { Input } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Button } from '@ponti-studios/ui/primitives';
import { ChevronRightIcon, FolderIcon, PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Form, Link } from 'react-router';

import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/projects';

export const meta: Route.MetaFunction = () => [
  { title: 'Projects | career' },
  { name: 'description', content: 'Side projects and portfolio work.' },
];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;

  try {
    const projects = await ProjectRepository.list(db, user.id);
    return { projects };
  } catch (error) {
    logger.error('Error loading projects', error, { owner_userid: user.id });
    return { projects: [] as CareerProjectRecord[] };
  }
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const id = formData.get('id');
    if (typeof id === 'string') {
      await ProjectRepository.remove(db, user.id, id);
    }
  }

  return { ok: true };
}

function filterProjects(projects: CareerProjectRecord[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return projects;
  return projects.filter((p) => p.title.toLowerCase().includes(query));
}

export default function ProjectsRoute({ loaderData }: Route.ComponentProps) {
  const { projects } = loaderData;
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterProjects(projects, search), [projects, search]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <SectionIntro title="Projects" description="Side projects and portfolio work." />
        <Button asChild variant="outline">
          <Link to="/projects/new">
            <PlusIcon className="mr-2 size-4" />
            Add project
          </Link>
        </Button>
      </div>

      {projects.length > 0 && (
        <div className="mt-4">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="size-6" />}
          title="No projects yet"
          description="Add a project to showcase your work."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 divide-y divide-border rounded-lg border border-border">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="heading-4 truncate">{project.title}</p>
                {project.organization && (
                  <p className="body-3 text-muted-foreground truncate">{project.organization}</p>
                )}
                {project.shortDescription && (
                  <p className="body-3 text-muted-foreground truncate">
                    {project.shortDescription}
                  </p>
                )}
                {Array.isArray(project.technologies) && project.technologies.length > 0 && (
                  <p className="footnote text-muted-foreground mt-1">
                    {project.technologies.join(', ')}
                  </p>
                )}
                {project.engagements.length > 0 && (
                  <p className="footnote text-muted-foreground mt-1">
                    {project.engagements.map((engagement) => engagement.company).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Form
                  method="post"
                  navigate={false}
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={(e) => {
                    if (!confirm(`Delete "${project.title}"?`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={project.id} />
                  <button
                    type="submit"
                    className="footnote text-muted-foreground hover:text-destructive-text"
                  >
                    Delete
                  </button>
                </Form>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

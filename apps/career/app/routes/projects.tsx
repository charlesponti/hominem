import { ProjectRepository, db, type CareerProjectRecord } from '@hominem/db';
import { Input } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Button } from '@ponti-studios/ui/primitives';
import { FolderIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Form, Link } from 'react-router';

import { CareerCollection } from '~/components/career/career-list';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { formatDateRange } from '~/lib/utils/dateRange';

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

      <div className="mt-6">
        <CareerCollection
          items={filtered}
          keyFor={(p) => p.id}
          hrefFor={(p) => `/projects/${p.id}`}
          title={(p) => p.title}
          subtitle={(p) => p.organization ?? p.shortDescription ?? undefined}
          meta={(p) => (p.startDate || p.endDate) && formatDateRange(p.startDate, p.endDate)}
          trailing={(p) => (
            <Form
              method="post"
              navigate={false}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                if (!confirm(`Delete "${p.title}"?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={p.id} />
              <button
                type="submit"
                className="footnote text-muted-foreground hover:text-destructive-text"
              >
                <Trash2Icon className="size-4" />
              </button>
            </Form>
          )}
          empty={
            projects.length === 0
              ? {
                  icon: <FolderIcon className="size-6" />,
                  title: 'No projects yet',
                  description: 'Add a project to showcase your work.',
                }
              : {
                  variant: 'search',
                  title: 'No matching projects',
                  description: 'Try a different search.',
                }
          }
        />
      </div>
    </div>
  );
}

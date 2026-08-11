import { ProjectRepository, db, type CareerProjectRecord } from '@hominem/db';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { FolderIcon, FolderKanbanIcon, PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { AddButton } from '~/components/AddButton';
import { CareerCollection } from '~/components/career/career-list';
import { ExpandableSearch } from '~/components/career/ExpandableSearch';
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
        <AddButton asChild label="Add project">
          <Link to="/projects/new">
            <PlusIcon aria-hidden />
          </Link>
        </AddButton>
      </div>

      {projects.length > 0 && (
        <div className="mt-4">
          <ExpandableSearch
            id="projects-search"
            value={search}
            onChange={setSearch}
            placeholder="Search projects..."
            ariaLabel="Search projects"
          />
        </div>
      )}

      <div className="mt-6">
        <CareerCollection
          items={filtered}
          keyFor={(p) => p.id}
          hrefFor={(p) => `/projects/${p.id}`}
          leading={() => (
            <span className="flex size-10 items-center justify-center rounded-xl bg-warning-subtle text-warning sm:size-11">
              <FolderKanbanIcon className="size-5" aria-hidden />
            </span>
          )}
          title={(p) => p.title}
          subtitle={(p) => p.organization ?? p.shortDescription ?? undefined}
          meta={(p) => (p.startDate || p.endDate) && formatDateRange(p.startDate, p.endDate)}
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

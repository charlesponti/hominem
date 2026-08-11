import { ProjectRepository, db } from '@hominem/db';
import { buttonVariants } from '@ponti-studios/ui/primitives';
import { BriefcaseIcon, FolderIcon, PlusIcon } from 'lucide-react';
import { Link } from 'react-router';

import { CareerCollection } from '~/components/career/career-list';
import { getUserEngagements } from '~/lib/career/queries/career-queries';
import { userContext } from '~/lib/middleware';
import { cn } from '~/lib/utils';
import { formatDateRange } from '~/lib/utils/dateRange';

import { Route } from './+types/home';

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'career' },
    {
      name: 'description',
      content:
        'A private workspace for job seekers who need to reuse their best proof, tailor serious applications, and keep a long search organized.',
    },
    { property: 'og:title', content: 'career - keep your job search from scattering' },
    {
      property: 'og:description',
      content:
        'A private workspace for job seekers who need to reuse their best proof, tailor serious applications, and keep a long search organized.',
    },
  ];
};

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) {
    return { authenticated: false as const };
  }

  const [engagements, projects] = await Promise.all([
    getUserEngagements(user.id),
    ProjectRepository.list(db, user.id),
  ]);

  return {
    authenticated: true as const,
    engagements: engagements.slice(0, 5),
    projects: projects.slice(0, 6),
  };
}

const searchProblems = [
  {
    label: 'Stop starting over',
    copy: 'Every strong application asks for a slightly different version of your story.',
  },
  {
    label: 'Find your best proof',
    copy: 'Your best projects, wins, links, and resume bullets are spread across too many places.',
  },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  if (loaderData.authenticated) {
    return (
      <div className="flex flex-col gap-10">
        <WorkSummary engagements={loaderData.engagements} />
        <ProjectsSummary projects={loaderData.projects} />
      </div>
    );
  }

  return <LandingPage />;
}

function SummarySection({
  title,
  viewAllTo,
  addTo,
  addLabel,
  children,
}: {
  title: string;
  viewAllTo: string;
  addTo: string;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <h2 className="heading-4 text-foreground">{title}</h2>
        <div className="flex items-center gap-4">
          <Link
            to={viewAllTo}
            className="footnote font-mono text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </Link>
          <Link
            to={addTo}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <PlusIcon className="size-4" />
            {addLabel}
          </Link>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function WorkSummary({
  engagements,
}: {
  engagements: Array<{
    id: string;
    title: string;
    company: string;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean | null;
  }>;
}) {
  return (
    <SummarySection title="Work history" viewAllTo="/work" addTo="/work/new" addLabel="Add role">
      <CareerCollection
        items={engagements}
        keyFor={(e) => e.id}
        hrefFor={(e) => `/work/${e.id}`}
        title={(e) => e.title}
        subtitle={(e) => e.company}
        meta={(e) => formatDateRange(e.startDate, e.isCurrent ? null : e.endDate)}
        empty={{
          icon: <BriefcaseIcon className="size-6" />,
          title: 'No positions yet',
          description: "Add your roles as you go so your story isn't a scramble later.",
          action: (
            <Link to="/work/new" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              Add your first role
            </Link>
          ),
        }}
      />
    </SummarySection>
  );
}

function ProjectsSummary({
  projects,
}: {
  projects: Array<{
    id: string;
    title: string;
    organization: string | null;
    shortDescription: string | null;
    startDate: string | null;
    endDate: string | null;
  }>;
}) {
  return (
    <SummarySection
      title="Projects"
      viewAllTo="/projects"
      addTo="/projects/new"
      addLabel="Add project"
    >
      <CareerCollection
        items={projects}
        keyFor={(p) => p.id}
        hrefFor={(p) => `/projects/${p.id}`}
        title={(p) => p.title}
        subtitle={(p) => p.organization ?? p.shortDescription ?? undefined}
        meta={(p) => (p.startDate || p.endDate) && formatDateRange(p.startDate, p.endDate)}
        empty={{
          icon: <FolderIcon className="size-6" />,
          title: 'No projects yet',
          description: "Log a project or win while it's fresh, before the details fade.",
          action: (
            <Link
              to="/projects/new"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Add your first project
            </Link>
          ),
        }}
      />
    </SummarySection>
  );
}

function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <section className="relative flex min-h-[calc(100vh-5rem)] w-full flex-col">
        <main className="flex flex-1 items-center">
          <div className="w-full">
            <div className="max-w-2xl">
              <h1 className="display-1 mt-5 max-w-2xl">Keep your job search from scattering.</h1>
              <p className="body-1 mt-6 max-w-xl text-muted-foreground">
                career helps you reuse your best proof, tailor the applications that matter, and
                remember what you sent when the search stretches on.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className={cn(buttonVariants({ size: 'lg' }), 'h-11 rounded-full px-6 text-sm')}
                >
                  Get started
                </Link>
                <Link
                  to="/demo"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-11 rounded-full px-5 text-sm',
                  )}
                >
                  See the difference
                </Link>
              </div>
            </div>

            <div className="mt-14 border-t border-border pt-6">
              <p className="ui-eyebrow">What gets hard</p>
              <div className="mt-5 grid gap-5 border-y border-border py-5">
                {searchProblems.map((problem, index) => (
                  <div key={problem.label}>
                    <p className="ui-eyebrow">{String(index + 1).padStart(2, '0')}</p>
                    <p className="heading-4 mt-3 text-foreground">{problem.label}</p>
                    <p className="body-2 mt-2 max-w-2xl text-muted-foreground">{problem.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <section className="py-7">
              <p className="ui-eyebrow">What it replaces</p>
              <p className="heading-2 mt-3 max-w-3xl text-foreground">
                No more scattered docs, messy tabs, and repeating yourself.
              </p>
              <p className="body-2 mt-5 max-w-2xl text-muted-foreground">
                Built for the parts of the search you can control: your story, your proof, your
                follow-through, and your memory. It will not make employers respond. It will help
                you stop applying from scratch.
              </p>
            </section>

            <footer className="flex items-center justify-between border-t border-border py-5 footnote text-muted-foreground">
              <span>career</span>
              <span>Less scrambling. More control.</span>
            </footer>
          </div>
        </main>
      </section>
    </div>
  );
}

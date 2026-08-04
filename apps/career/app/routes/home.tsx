import { buttonVariants } from '@ponti-studios/ui/primitives';
import { Link } from 'react-router';

import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import { cn } from '~/lib/utils';

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
  if (!user) return { authenticated: false as const };

  try {
    return { authenticated: true as const };
  } catch (error) {
    logger.error('Error loading career data', error, { owner_userid: user.id });
    throw new Response('Failed to load career data', { status: 500 });
  }
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
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="heading-2">Your career workspace</h1>
          <p className="body-2 mt-2 text-muted-foreground">
            Manage your positions, applications, and education history.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/work"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-24 flex-col items-start justify-center gap-1',
            )}
          >
            <span className="heading-4">Positions</span>
            <span className="body-3 text-muted-foreground">Work history & target roles</span>
          </Link>
          <Link
            to="/applications"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-24 flex-col items-start justify-center gap-1',
            )}
          >
            <span className="heading-4">Applications</span>
            <span className="body-3 text-muted-foreground">Track your pipeline</span>
          </Link>
          <Link
            to="/account"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-24 flex-col items-start justify-center gap-1',
            )}
          >
            <span className="heading-4">Profile</span>
            <span className="body-3 text-muted-foreground">Your career profile</span>
          </Link>
        </div>
      </div>
    );
  }
  return <LandingPage />;
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

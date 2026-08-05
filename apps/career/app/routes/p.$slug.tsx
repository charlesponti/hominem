import { CareerRepository, ProjectRepository, SkillRepository, db } from '@hominem/db';

import { Route } from './+types/p.$slug';

export async function loader({ params }: Route.LoaderArgs) {
  const profile = await CareerRepository.getProfileBySlug(db, params.slug);

  if (!profile) {
    throw new Response('Profile not found', { status: 404 });
  }

  const [positions, projects, skills] = await Promise.all([
    CareerRepository.listPositions(db, profile.ownerUserid, { type: 'employment' }),
    ProjectRepository.list(db, profile.ownerUserid),
    SkillRepository.list(db, profile.ownerUserid),
  ]);

  return { profile, positions, projects, skills };
}

export const meta: Route.MetaFunction = ({ params }) => [{ title: `${params.slug} | career` }];

export default function PublicProfilePage({ loaderData }: Route.ComponentProps) {
  const { profile, positions, projects, skills } = loaderData;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-12">
        <h1 className="heading-1">
          {profile.firstName} {profile.lastName}
        </h1>
        {profile.headline && (
          <p className="heading-3 text-muted-foreground mt-1">{profile.headline}</p>
        )}
        {profile.location && (
          <p className="body-2 text-muted-foreground mt-2">{profile.location}</p>
        )}
        {profile.summary && (
          <p className="body-1 mt-6 max-w-prose whitespace-pre-wrap">{profile.summary}</p>
        )}
      </header>

      {positions.length > 0 && (
        <section className="mb-12">
          <h2 className="heading-2 mb-6">Experience</h2>
          <div className="space-y-8">
            {positions.map((pos) => (
              <div key={pos.id}>
                <h3 className="heading-3">{pos.title}</h3>
                <p className="body-2 text-muted-foreground">
                  {pos.company}
                  {pos.location ? ` — ${pos.location}` : ''}
                </p>
                <p className="caption1 text-muted-foreground mt-0.5">
                  {pos.startDate ? formatDate(pos.startDate) : '?'} —{' '}
                  {pos.isCurrent ? 'Present' : pos.endDate ? formatDate(pos.endDate) : '?'}
                </p>
                {pos.description && (
                  <p className="body-2 mt-3 whitespace-pre-wrap">{pos.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mb-12">
          <h2 className="heading-2 mb-6">Projects</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="rounded-lg border p-4">
                <h3 className="heading-3">{p.title}</h3>
                {p.description && (
                  <p className="body-2 text-muted-foreground mt-2">{p.description}</p>
                )}
                {p.liveUrl && (
                  <a
                    href={p.liveUrl}
                    className="body-2 mt-2 inline-block underline"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View project
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="mb-12">
          <h2 className="heading-2 mb-6">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s.id} className="rounded-full bg-muted px-3 py-1 caption1">
                {s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {profile.copyright && (
        <footer className="mt-16 border-t pt-6">
          <p className="caption1 text-muted-foreground">{profile.copyright}</p>
        </footer>
      )}
    </div>
  );
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

import { data } from 'react-router';

import { getUserPositionById } from '~/lib/career/queries/career-queries';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/work.$id';

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  try {
    const position = await getUserPositionById(user.id, params.id);
    if (!position) throw new Response('Position not found', { status: 404 });
    return data({ position });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error('Error loading position', error, { position_id: params.id });
    throw new Response('Failed to load position', { status: 500 });
  }
}

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = matches[matches.length - 1]?.loaderData as
    | { position: { company?: string; title?: string } }
    | undefined;
  const position = data?.position;
  return [
    {
      title: position
        ? `${position.title ?? 'Position'} at ${position.company ?? 'Company'} | career`
        : 'Position | career',
    },
  ];
};

export default function WorkDetailPage({ loaderData }: Route.ComponentProps) {
  const { position } = loaderData;

  const salary =
    (position.salaryLow ?? position.salaryHigh)
      ? `${position.salaryLow ? `$${(position.salaryLow / 100).toLocaleString()}` : '?'} - ${position.salaryHigh ? `$${(position.salaryHigh / 100).toLocaleString()}` : '?'} ${position.currency ?? 'USD'}`
      : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="heading-1">{position.title}</h1>
        <p className="heading-3 text-muted-foreground mt-1">{position.company}</p>
        <div className="flex flex-wrap gap-3 mt-2">
          {position.recordType && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {position.recordType}
            </span>
          )}
          {position.isCurrent && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Current
            </span>
          )}
          {position.isTarget && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              Target
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {position.description && (
          <section>
            <h2 className="heading-4 mb-2">Description</h2>
            <p className="body-2 text-muted-foreground whitespace-pre-wrap">
              {position.description}
            </p>
          </section>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {position.location && (
            <div>
              <p className="footnote text-muted-foreground">Location</p>
              <p className="body-3">{position.location}</p>
            </div>
          )}
          {position.startDate && (
            <div>
              <p className="footnote text-muted-foreground">Start Date</p>
              <p className="body-3">{position.startDate}</p>
            </div>
          )}
          {position.endDate && (
            <div>
              <p className="footnote text-muted-foreground">End Date</p>
              <p className="body-3">{position.endDate}</p>
            </div>
          )}
          {salary && (
            <div>
              <p className="footnote text-muted-foreground">Salary</p>
              <p className="body-3">{salary}</p>
            </div>
          )}
        </section>

        {(position.address || position.contactName || position.contactPhone) && (
          <section>
            <h2 className="heading-4 mb-2">Contact</h2>
            <div className="rounded-lg border border-border p-4 space-y-1">
              {position.address && <p className="body-3">{position.address}</p>}
              {position.contactName && <p className="body-3">{position.contactName}</p>}
              {position.contactPhone && <p className="body-3">{position.contactPhone}</p>}
            </div>
          </section>
        )}

        {(position.source || position.url) && (
          <section>
            <h2 className="heading-4 mb-2">Source</h2>
            <div className="space-y-1">
              {position.source && (
                <p className="body-3 text-muted-foreground">via {position.source}</p>
              )}
              {position.url && (
                <a
                  href={position.url}
                  target="_blank"
                  rel="noreferrer"
                  className="body-3 text-blue-600 hover:underline"
                >
                  {position.url}
                </a>
              )}
            </div>
          </section>
        )}

        {position.projectStatus && (
          <section>
            <h2 className="heading-4 mb-2">Project Status</h2>
            <p className="body-2">{position.projectStatus}</p>
          </section>
        )}
      </div>
    </div>
  );
}

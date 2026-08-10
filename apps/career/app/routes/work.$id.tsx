import { CareerRepository, db } from '@hominem/db';
import { Button } from '@ponti-studios/ui/primitives';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { data, redirect } from 'react-router';
import { Form } from 'react-router';

import { PositionEditor } from '~/components/career/work/PositionEditor';
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

export async function action({ context, params, request }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    await CareerRepository.deletePosition(db, user.id, params.id);
    return redirect('/work');
  }

  const toInt = (raw: FormDataEntryValue | null) => {
    if (!raw || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  };

  try {
    await CareerRepository.updatePosition(db, user.id, params.id, {
      company: (formData.get('company') as string) ?? undefined,
      title: (formData.get('title') as string) ?? undefined,
      location: (formData.get('location') as string) || null,
      url: (formData.get('url') as string) || null,
      startDate: (formData.get('startDate') as string) || null,
      endDate: (formData.get('endDate') as string) || null,
      isCurrent: formData.get('isCurrent') === 'on',
      isTarget: formData.get('isTarget') === 'on',
      salaryLow: toInt(formData.get('salaryLow')),
      salaryHigh: toInt(formData.get('salaryHigh')),
      currency: (formData.get('currency') as string) || 'USD',
      description: (formData.get('description') as string) || null,
      contactName: (formData.get('contactName') as string) || null,
      contactPhone: (formData.get('contactPhone') as string) || null,
      source: (formData.get('source') as string) || null,
      projectStatus: (formData.get('projectStatus') as string) || null,
    });
    return data({ ok: true });
  } catch (error) {
    logger.error('Error updating position', error, { position_id: params.id });
    throw new Response('Failed to update position', { status: 500 });
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
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="heading-2">Edit position</h1>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
        <div className="rounded-lg border border-border p-6">
          <PositionEditor position={position} onCancel={() => setIsEditing(false)} />
        </div>
      </div>
    );
  }

  const salary =
    (position.salaryLow ?? position.salaryHigh)
      ? `${position.salaryLow ? `$${(position.salaryLow / 100).toLocaleString()}` : '?'} - ${position.salaryHigh ? `$${(position.salaryHigh / 100).toLocaleString()}` : '?'} ${position.currency ?? 'USD'}`
      : null;

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="heading-1">{position.title}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <PencilIcon className="size-4 mr-2" />
              Edit
            </Button>
            <Form
              method="post"
              navigate={false}
              onSubmit={(e) => {
                if (!confirm(`Delete "${position.title}" at ${position.company}?`))
                  e.preventDefault();
              }}
            >
              <input type="hidden" name="intent" value="delete" />
              <Button type="submit" variant="outline" size="sm">
                <Trash2Icon className="size-4 mr-2" />
                Delete
              </Button>
            </Form>
          </div>
        </div>
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

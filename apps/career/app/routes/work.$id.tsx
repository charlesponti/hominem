import { CareerRepository, db, type AppCareerEngagementKind } from '@hominem/db';
import { humanizeIdentifier } from '@hominem/utils/text';
import { Button } from '@ponti-studios/ui/primitives';
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { data, Form, Link, redirect } from 'react-router';

import { PositionEditor } from '~/components/career/work/PositionEditor';
import { StatusBadge } from '~/components/status-badge';
import { getUserEngagementById } from '~/lib/career/queries/career-queries';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/work.$id';

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  try {
    const position = await getUserEngagementById(user.id, params.id);
    if (!position) throw new Response('Engagement not found', { status: 404 });
    return data({ position });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error('Error loading engagement', error, { engagement_id: params.id });
    throw new Response('Failed to load engagement', { status: 500 });
  }
}

export async function action({ context, params, request }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    await CareerRepository.deleteEngagement(db, user.id, params.id);
    return redirect('/work');
  }

  const toInt = (raw: FormDataEntryValue | null) => {
    if (!raw || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  };

  try {
    const updated = await CareerRepository.updateEngagement(db, {
      id: params.id,
      ownerUserid: user.id,
      company: (formData.get('company') as string) ?? undefined,
      title: (formData.get('title') as string) ?? undefined,
      location: (formData.get('location') as string) || null,
      address: (formData.get('address') as string) || null,
      url: (formData.get('url') as string) || null,
      startDate: (formData.get('startDate') as string) || null,
      endDate: (formData.get('endDate') as string) || null,
      isCurrent: formData.get('isCurrent') === 'on',
      salaryLow: toInt(formData.get('salaryLow')),
      salaryHigh: toInt(formData.get('salaryHigh')),
      currency: (formData.get('currency') as string) || 'USD',
      description: (formData.get('description') as string) || null,
      contactName: (formData.get('contactName') as string) || null,
      contactPhone: (formData.get('contactPhone') as string) || null,
      source: (formData.get('source') as string) || null,
      kind: (formData.get('kind') as AppCareerEngagementKind) || 'EMPLOYMENT',
      reasonForLeaving: (formData.get('reasonForLeaving') as string) || null,
    });
    if (!updated) throw new Response('Engagement not found', { status: 404 });
    return data({ ok: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error('Error updating engagement', error, { engagement_id: params.id });
    throw new Response('Failed to update engagement', { status: 500 });
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

const cardClass = 'rounded-xl border border-border bg-card p-6';

export default function WorkDetailPage({ loaderData }: Route.ComponentProps) {
  const { position } = loaderData;
  const [isEditing, setIsEditing] = useState(false);

  const salary =
    (position.salaryLow ?? position.salaryHigh)
      ? `${position.salaryLow ? `$${(position.salaryLow / 100).toLocaleString('en-US')}` : '?'} – ${position.salaryHigh ? `$${(position.salaryHigh / 100).toLocaleString('en-US')}` : '?'} ${position.currency ?? 'USD'}`
      : null;

  if (isEditing) {
    return (
      <div>
        <Link
          to="/work"
          className="footnote mb-4 inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Work history
        </Link>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="heading-2">Edit engagement</h1>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
        <div className={cardClass}>
          <PositionEditor position={position} onCancel={() => setIsEditing(false)} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/work"
        className="footnote mb-4 inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Work history
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="heading-1">{position.title}</h1>
            <p className="heading-4 mt-1 text-muted-foreground">{position.company}</p>
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
                if (!confirm(`Delete "${position.title}" at ${position.company}?`))
                  e.preventDefault();
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
          {position.isCurrent && <StatusBadge tone="success" label="Current" />}
          {position.kind && (
            <StatusBadge tone="neutral" label={humanizeIdentifier(position.kind)} />
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <section className={cardClass}>
          <h2 className="ui-eyebrow mb-4 text-muted-foreground">Details</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailField label="Location" value={position.location} />
            <DetailField label="Start date" value={position.startDate} mono />
            <DetailField
              label="End date"
              value={position.isCurrent ? 'Present' : position.endDate}
              mono
            />
            <DetailField label="Salary" value={salary} mono />
          </div>
        </section>

        {position.description && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-3 text-muted-foreground">Description</h2>
            <p className="body-2 whitespace-pre-wrap text-foreground">{position.description}</p>
          </section>
        )}

        {position.reasonForLeaving && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-3 text-muted-foreground">Reason for leaving</h2>
            <p className="body-2 whitespace-pre-wrap text-foreground">
              {position.reasonForLeaving}
            </p>
          </section>
        )}

        {(position.address || position.contactName || position.contactPhone) && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-4 text-muted-foreground">Contact</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DetailField label="Contact name" value={position.contactName} />
              <DetailField label="Contact phone" value={position.contactPhone} mono />
              <DetailField label="Address" value={position.address} />
            </div>
          </section>
        )}

        {(position.source || position.url) && (
          <section className={cardClass}>
            <h2 className="ui-eyebrow mb-3 text-muted-foreground">Source</h2>
            <div className="space-y-1">
              {position.source && (
                <p className="body-3 text-muted-foreground">via {position.source}</p>
              )}
              {position.url && (
                <a
                  href={position.url}
                  target="_blank"
                  rel="noreferrer"
                  className="body-3 text-primary hover:underline"
                >
                  {position.url}
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

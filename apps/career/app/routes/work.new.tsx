import { CareerRepository, db } from '@hominem/db';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { redirect } from 'react-router';

import { PositionEditor } from '~/components/career/work/PositionEditor';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/work.new';

export const meta: Route.MetaFunction = () => [
  { title: 'New Engagement | career' },
  { name: 'description', content: 'Add a work history engagement.' },
];

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const company = (formData.get('company') as string)?.trim();
  const title = (formData.get('title') as string)?.trim();
  if (!company || !title) throw new Response('Company and title are required', { status: 400 });

  try {
    const toInt = (raw: FormDataEntryValue | null) => {
      if (!raw || raw === '') return null;
      const n = Number(raw);
      return Number.isFinite(n) ? Math.round(n * 100) : null;
    };

    const engagement = await CareerRepository.createEngagement(db, user.id, {
      company,
      title,
      location: (formData.get('location') as string) || null,
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
      kind: (formData.get('kind') as string) || 'EMPLOYMENT',
    });

    return redirect(`/work/${engagement.id}`);
  } catch (error) {
    logger.error('Error creating engagement', error, { owner_userid: user.id });
    throw new Response('Failed to create engagement. Please try again.', { status: 500 });
  }
}

export default function NewPositionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <SectionIntro title="New Engagement" description="Add a work history engagement." />
      </div>
      <div className="rounded-lg border border-border p-6">
        <PositionEditor submitLabel="Create engagement" />
      </div>
    </div>
  );
}

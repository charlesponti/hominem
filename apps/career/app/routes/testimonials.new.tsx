import { TestimonialRepository, db } from '@hominem/db';
import { TextField, Textarea } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Form, redirect } from 'react-router';

import { AddButton } from '~/components/AddButton';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/testimonials.new';

export const meta: Route.MetaFunction = () => [{ title: 'Add testimonial | career' }];

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const formData = await request.formData();
  const name = (formData.get('name') as string)?.trim();
  const content = (formData.get('content') as string)?.trim();
  if (!name || !content) return { error: 'Name and testimonial content are required' };

  await TestimonialRepository.create(db, user.id, {
    name,
    content,
    title: (formData.get('title') as string) || null,
    company: (formData.get('company') as string) || null,
    linkedinUrl: (formData.get('linkedinUrl') as string) || null,
  });

  return redirect('/testimonials');
}

export default function NewTestimonialRoute({ actionData }: Route.ComponentProps) {
  return (
    <div className="max-w-2xl">
      <SectionIntro
        title="Add testimonial"
        description="Add a testimonial from a colleague, manager, or client."
      />

      <Form method="post" className="mt-6 flex flex-col gap-4">
        <TextField label="Name" name="name" required placeholder="Jane Doe" />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Title" name="title" placeholder="Engineering Manager" />
          <TextField label="Company" name="company" placeholder="Acme Inc." />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-foreground text-sm font-medium">
            Testimonial
          </label>
          <Textarea id="content" name="content" rows={4} required />
        </div>
        <TextField label="LinkedIn URL" name="linkedinUrl" placeholder="https://" />
        {actionData?.error && <p className="body-3 text-destructive-text">{actionData.error}</p>}
        <div className="flex justify-end">
          <AddButton type="submit" label="Add testimonial" />
        </div>
      </Form>
    </div>
  );
}

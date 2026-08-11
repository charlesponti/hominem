import { TestimonialRepository, db } from '@hominem/db';
import { TextField, Textarea } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { Form, redirect } from 'react-router';

import { userContext } from '~/lib/middleware';

import { Route } from './+types/testimonials.$id';

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.testimonial.name} | career` : 'Testimonial | career' },
];

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  const testimonials = await TestimonialRepository.list(db, user.id);
  const testimonial = testimonials.find((t) => t.id === params.id);
  if (!testimonial) throw new Response('Testimonial not found', { status: 404 });
  return { testimonial };
}

export async function action({ context, params, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    await TestimonialRepository.remove(db, user.id, params.id);
    return redirect('/testimonials');
  }

  const name = (formData.get('name') as string)?.trim();
  const content = (formData.get('content') as string)?.trim();
  if (!name || !content) return { error: 'Name and testimonial content are required' };

  await TestimonialRepository.update(db, user.id, params.id, {
    name,
    content,
    title: (formData.get('title') as string) || null,
    company: (formData.get('company') as string) || null,
    linkedinUrl: (formData.get('linkedinUrl') as string) || null,
  });

  return { ok: true };
}

export default function TestimonialDetailRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { testimonial } = loaderData;

  return (
    <div className="max-w-2xl">
      <Form method="post" className="flex flex-col gap-4">
        <TextField label="Name" name="name" required defaultValue={testimonial.name} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Title" name="title" defaultValue={testimonial.title ?? ''} />
          <TextField label="Company" name="company" defaultValue={testimonial.company ?? ''} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-foreground text-sm font-medium">
            Testimonial
          </label>
          <Textarea
            id="content"
            name="content"
            rows={4}
            required
            defaultValue={testimonial.content}
          />
        </div>
        <TextField
          label="LinkedIn URL"
          name="linkedinUrl"
          defaultValue={testimonial.linkedinUrl ?? ''}
        />
        {actionData?.error && <p className="body-3 text-destructive-text">{actionData.error}</p>}
        <div className="flex justify-between">
          <Button type="submit" name="intent" value="delete" variant="ghost">
            Delete
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </Form>
    </div>
  );
}

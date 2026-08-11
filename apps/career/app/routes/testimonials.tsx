import { TestimonialRepository, db, type CareerTestimonialRecord } from '@hominem/db';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { PlusIcon, QuoteIcon, Trash2Icon } from 'lucide-react';
import { Form, Link } from 'react-router';

import { AddButton } from '~/components/AddButton';
import { CareerCollection } from '~/components/career/career-list';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/testimonials';

export const meta: Route.MetaFunction = () => [
  { title: 'Testimonials | career' },
  { name: 'description', content: 'Testimonials from colleagues, managers, and clients.' },
];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;

  try {
    const testimonials = await TestimonialRepository.list(db, user.id);
    return { testimonials };
  } catch (error) {
    logger.error('Error loading testimonials', error, { owner_userid: user.id });
    return { testimonials: [] as CareerTestimonialRecord[] };
  }
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const id = formData.get('id');
    if (typeof id === 'string') {
      await TestimonialRepository.remove(db, user.id, id);
    }
  }

  return { ok: true };
}

export default function TestimonialsRoute({ loaderData }: Route.ComponentProps) {
  const { testimonials } = loaderData;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <SectionIntro
          title="Testimonials"
          description="Testimonials from colleagues, managers, and clients."
        />
        <AddButton asChild label="Add testimonial">
          <Link to="/testimonials/new">
            <PlusIcon aria-hidden />
          </Link>
        </AddButton>
      </div>

      <div className="mt-6">
        <CareerCollection
          items={testimonials}
          keyFor={(t) => t.id}
          hrefFor={(t) => `/testimonials/${t.id}`}
          title={(t) => t.name}
          subtitle={(t) => [t.title, t.company].filter(Boolean).join(' at ')}
          meta={(t) => t.content}
          trailing={(t) => (
            <Form
              method="post"
              navigate={false}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                if (!confirm(`Delete testimonial from "${t.name}"?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                className="footnote text-muted-foreground hover:text-destructive-text"
              >
                <Trash2Icon className="size-4" />
              </button>
            </Form>
          )}
          empty={{
            icon: <QuoteIcon className="size-6" />,
            title: 'No testimonials yet',
            description: 'Add a testimonial to showcase your work.',
          }}
        />
      </div>
    </div>
  );
}

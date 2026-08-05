import { TestimonialRepository, db, type CareerTestimonialRecord } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Button } from '@ponti-studios/ui/primitives';
import { ChevronRightIcon, PlusIcon, QuoteIcon } from 'lucide-react';
import { Form, Link } from 'react-router';

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
        <Button asChild variant="outline">
          <Link to="/testimonials/new">
            <PlusIcon className="mr-2 size-4" />
            Add testimonial
          </Link>
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <EmptyState
          icon={<QuoteIcon className="size-6" />}
          title="No testimonials yet"
          description="Add a testimonial to showcase your work."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 divide-y divide-border rounded-lg border border-border">
          {testimonials.map((testimonial) => (
            <Link
              key={testimonial.id}
              to={`/testimonials/${testimonial.id}`}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="heading-4 truncate">{testimonial.name}</p>
                <p className="body-3 text-muted-foreground truncate">
                  {[testimonial.title, testimonial.company].filter(Boolean).join(' at ')}
                </p>
                <p className="footnote text-muted-foreground mt-1 truncate">
                  {testimonial.content}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Form
                  method="post"
                  navigate={false}
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={(e) => {
                    if (!confirm(`Delete testimonial from "${testimonial.name}"?`))
                      e.preventDefault();
                  }}
                >
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={testimonial.id} />
                  <button
                    type="submit"
                    className="footnote text-muted-foreground hover:text-destructive-text"
                  >
                    Delete
                  </button>
                </Form>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import type { TestimonialRecord as Testimonial } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { Badge, Button } from '@ponti-studios/ui/primitives';
import { ChevronRightIcon, PlusIcon, StarIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  EntityListCards,
  EntityListTable,
  PageHeader,
  SearchFilterBar,
  type EntityListColumn,
} from '~/components/patterns';
import { getTestimonialsByPortfolio } from '~/lib/career/queries/testimonials';
import { portfolioContext } from '~/lib/middleware';

import { Route } from './+types/testimonials';

export const meta: Route.MetaFunction = () => [{ title: 'Testimonials | career' }];

export function filterTestimonialsBySearch(testimonials: Testimonial[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return testimonials;
  }

  return testimonials.filter((testimonial) => {
    const name = testimonial.name?.trim().toLowerCase() || '';
    const company = testimonial.company?.trim().toLowerCase() || '';
    return name.includes(query) || company.includes(query);
  });
}

function formatCompanyLabel(testimonial: Testimonial) {
  if (testimonial.company && testimonial.title) {
    return `${testimonial.company} · ${testimonial.title}`;
  }
  return testimonial.company || testimonial.title || '—';
}

function RatingBadge({ testimonial }: { testimonial: Testimonial }) {
  if (!testimonial.rating) {
    return null;
  }
  return (
    <Badge variant="outline" className="gap-1">
      <StarIcon className="size-3" />
      {testimonial.rating}
    </Badge>
  );
}

const TESTIMONIAL_COLUMNS: EntityListColumn<Testimonial>[] = [
  {
    key: 'name',
    header: 'Name',
    width: 'minmax(0,1.5fr)',
    render: (testimonial) => (
      <p className="body-2 truncate text-text-primary">{testimonial.name}</p>
    ),
  },
  {
    key: 'company',
    header: 'Company',
    width: 'minmax(0,1fr)',
    render: (testimonial) => (
      <p className="body-2 truncate text-text-secondary">{formatCompanyLabel(testimonial)}</p>
    ),
  },
  {
    key: 'rating',
    header: 'Rating',
    width: 'minmax(0,0.7fr)',
    render: (testimonial) =>
      testimonial.rating ? (
        <RatingBadge testimonial={testimonial} />
      ) : (
        <span className="body-4 text-text-tertiary">—</span>
      ),
  },
];

function renderTestimonialCard(testimonial: Testimonial) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="body-2 truncate text-text-primary">{testimonial.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="body-4 truncate text-text-secondary">{formatCompanyLabel(testimonial)}</p>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-3">
        <RatingBadge testimonial={testimonial} />
        <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function Testimonials({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const filteredTestimonials = useMemo(
    () => filterTestimonialsBySearch(loaderData.testimonials, searchValue),
    [loaderData.testimonials, searchValue],
  );

  const hasFilters = Boolean(searchValue.trim());

  const clearFilters = () => setSearchValue('');

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Testimonials">
        <Button
          type="button"
          onClick={() => navigate('/testimonials/new')}
          variant="default"
          size="icon"
          aria-label="Add testimonial"
        >
          <PlusIcon className="size-4" />
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <SearchFilterBar
          activeFilters={
            searchValue.trim()
              ? [
                  {
                    id: 'search',
                    label: `Search: ${searchValue.trim()}`,
                    onRemove: () => setSearchValue(''),
                  },
                ]
              : []
          }
          onClear={clearFilters}
        >
          <SearchFilterBar.Search
            id="testimonial-search"
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search by name or company..."
            ariaLabel="Search testimonials"
          />
        </SearchFilterBar>

        {filteredTestimonials.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No testimonials match your search' : 'No testimonials yet'}
            description={
              hasFilters
                ? 'Try adjusting your search'
                : 'Add client quotes to showcase on your portfolio'
            }
            variant={hasFilters ? 'search' : 'dashed'}
            size={hasFilters ? 'md' : undefined}
          />
        ) : (
          <>
            <EntityListTable
              items={filteredTestimonials}
              columns={TESTIMONIAL_COLUMNS}
              keyFor={(testimonial) => testimonial.id}
              hrefFor={(testimonial) => `/testimonials/${testimonial.id}`}
              linkComponent={Link}
            />
            <EntityListCards
              items={filteredTestimonials}
              keyFor={(testimonial) => testimonial.id}
              hrefFor={(testimonial) => `/testimonials/${testimonial.id}`}
              linkComponent={Link}
              renderCard={renderTestimonialCard}
            />
          </>
        )}
      </div>
    </section>
  );
}

export async function loader({ context }: Route.LoaderArgs) {
  const portfolio = context.get(portfolioContext)!;
  const testimonials = await getTestimonialsByPortfolio(portfolio.id);

  return { testimonials, portfolioId: portfolio.id };
}

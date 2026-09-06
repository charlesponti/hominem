import { ArrowLeft, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { useCollectionsList } from '~/hooks/use-collections';

import { CreateCollectionDialog } from './create-collection-dialog';

const PAGE_SIZE = 20;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function CollectionsPage() {
  const [page, setPage] = useState(0);
  const { data, error, isPending, refetch } = useCollectionsList();
  const collections = data?.collections ?? [];
  const pageCollections = collections.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(collections.length / PAGE_SIZE));

  function handleRetry() {
    // eslint-disable-next-line no-void -- fire-and-forget refetch, result intentionally unused
    void refetch();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Button aria-label="Back to chat" asChild size="icon-sm" variant="ghost">
          <Link to="/" viewTransition>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground">
            Everything you've grouped together, owned or shared with you.
          </p>
        </div>
        <CreateCollectionDialog />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {isPending ? (
          <p className="p-5 text-sm text-muted-foreground">Loading collections…</p>
        ) : null}
        {error ? (
          <div className="space-y-3 p-5">
            <p className="text-sm text-destructive">Collections unavailable.</p>
            <Button onClick={handleRetry} variant="secondary">
              Try again
            </Button>
          </div>
        ) : null}
        {!isPending && !error && collections.length === 0 ? (
          <div className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">No collections yet.</p>
            <CreateCollectionDialog />
          </div>
        ) : null}
        {!isPending && !error && pageCollections.length > 0 ? (
          <div className="divide-y divide-border">
            {pageCollections.map((collection) => (
              <Link
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted"
                key={collection.id}
                to={`/collections/${collection.id}`}
                viewTransition
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{collection.name}</span>
                    {collection.visibility === 'shared' ? (
                      <Badge className="gap-1" variant="secondary">
                        <Users className="size-3" /> Shared
                      </Badge>
                    ) : null}
                  </div>
                  {collection.description ? (
                    <p className="truncate text-sm text-muted-foreground">
                      {collection.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {collection.itemCount} item{collection.itemCount === 1 ? '' : 's'}
                  </span>
                  <span className="hidden sm:inline">
                    {dateFormatter.format(new Date(collection.updatedAt))}
                  </span>
                  <ChevronRight className="size-4" />
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {collections.length > PAGE_SIZE ? (
        <nav aria-label="Collection pages" className="mt-5 flex items-center justify-between">
          <Button
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
            variant="outline"
          >
            <ChevronLeft /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {pageCount}
          </span>
          <Button
            disabled={page >= pageCount - 1}
            onClick={() => setPage((current) => current + 1)}
            variant="outline"
          >
            Next <ChevronRight />
          </Button>
        </nav>
      ) : null}
    </main>
  );
}

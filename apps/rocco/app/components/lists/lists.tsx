import { List } from '@hominem/ui/list';

import { trpc } from '~/lib/trpc/client';

import ListForm from './list-form';
import { ListRow } from './list-row';

export default function Lists() {
  const { data: lists = [], isLoading, error } = trpc.lists.getAll.useQuery();

  const title = <h2 className="heading-2">Lists</h2>;

  if (error) {
    return (
      <div className="space-y-2">
        {title}
        <div className="text-center py-8">
          <p className="text-red-600">Error loading lists: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="lists">
      {title}

      <div className="space-y-1">
        {lists.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h3 className="text-lg font-semibold text-gray-900">No lists yet</h3>
            <p className="mt-1 text-sm text-gray-600">Get started by creating your first list.</p>
          </div>
        ) : (
          <List isLoading={isLoading} loadingSize="lg">
            {lists.map((list) => (
              <ListRow
                key={list.id}
                id={list.id}
                name={list.name}
                count={list.places.length || 0}
              />
            ))}
          </List>
        )}

        <ListForm />
      </div>
    </div>
  );
}

import { useSupabaseAuthContext } from '@hominem/auth';
import { List } from '@hominem/ui/list';
import { motion } from 'framer-motion';
import { memo } from 'react';

import type { PlaceWithLists } from '~/lib/types';

import { ListRow } from '~/components/lists/list-row';
import AddPlaceToList from '~/components/places/add-to-list-control';
import { useListsContainingPlace } from '~/lib/hono';

type Props = {
  place: PlaceWithLists;
};

const PlaceLists = ({ place }: Props) => {
  const { isAuthenticated } = useSupabaseAuthContext();

  const resolvedPlaceId = place.id;
  const googleMapsId = place.googleMapsId;

  const { data: listsResult, isLoading } = useListsContainingPlace(
    resolvedPlaceId || undefined,
    googleMapsId || undefined,
  );
  
  const listsContainingPlace = listsResult ?? [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div data-testid="place-lists" className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="heading-2 font-light">Lists</h3>
        <AddPlaceToList placeId={place.id} />
      </div>

      {listsContainingPlace.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground py-4"
        >
          You haven't added this place to any lists yet.
        </motion.div>
      ) : null}

      {(isLoading || listsContainingPlace.length > 0) && (
        <List isLoading={isLoading} loadingSize="md">
          {listsContainingPlace.map((list: any) => (
            <ListRow
              key={list.id}
              id={list.id}
              name={list.name}
              count={list.itemCount || 0}
              imageUrl={list.imageUrl}
              imageAlt={list.name}
            />
          ))}
        </List>
      )}
    </div>
  );
};

export default memo(PlaceLists);

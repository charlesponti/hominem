import { useSupabaseAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@hominem/ui/components/ui/drawer';
import { ListPlus } from 'lucide-react';
import { useState, lazy, Suspense } from 'react';
import z from 'zod';

import { usePlaceById, usePlaceByGoogleId } from '~/lib/hono';

const AddToListDrawerContent = lazy(() => import('./add-to-list-drawer-content'));

interface AddToListControlProps {
  placeId: string;
}

const AddToListControl = ({ placeId }: AddToListControlProps) => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useSupabaseAuthContext();
  const isUuid = z.uuid().safeParse(placeId).success;

  // Fetch place details
  const { data: placeDetails } = usePlaceById(isAuthenticated && isUuid ? placeId : undefined);

  const { data: placeDetailsByGoogleId } = usePlaceByGoogleId(
    isAuthenticated && !isUuid ? placeId : undefined,
  );

  const place = placeDetails || placeDetailsByGoogleId;
  const resolvedPlaceId = isUuid ? placeId : place?.id;
  const googleMapsId = isUuid ? place?.googleMapsId : placeId;

  const handleMouseEnter = () => {
    // No-op - prefetching handled by useHonoUtils
  };

  if (!(isAuthenticated && place)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button size="sm" className="flex items-center gap-2" onMouseEnter={handleMouseEnter}>
            <ListPlus size={16} />
            Add to lists
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <Suspense fallback={<div className="h-[40vh] bg-background animate-pulse" />}>
            <AddToListDrawerContent
              place={place}
              resolvedPlaceId={resolvedPlaceId}
              googleMapsId={googleMapsId}
              onClose={() => setOpen(false)}
            />
          </Suspense>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default AddToListControl;

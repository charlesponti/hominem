import { useSupabaseAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@hominem/ui/components/ui/drawer';
import { ListPlus } from 'lucide-react';
import { useState, lazy, Suspense } from 'react';
import z from 'zod';
import { trpc } from '~/lib/trpc/client';

const AddToListDrawerContent = lazy(() => import('./add-to-list-drawer-content'));

interface AddToListControlProps {
  placeId: string;
}

const AddToListControl = ({ placeId }: AddToListControlProps) => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useSupabaseAuthContext();
  const utils = trpc.useUtils();
  const isUuid = z.uuid().safeParse(placeId).success;

  // Fetch place details
  const { data: placeDetails } = trpc.places.getDetailsById.useQuery(
    { id: placeId },
    {
      enabled: isAuthenticated && isUuid,
    },
  );

  const { data: placeDetailsByGoogleId } = trpc.places.getDetailsByGoogleId.useQuery(
    { googleMapsId: placeId },
    {
      enabled: isAuthenticated && !isUuid,
    },
  );

  const place = placeDetails || placeDetailsByGoogleId;
  const resolvedPlaceId = isUuid ? placeId : place?.id;
  const googleMapsId = isUuid ? place?.googleMapsId : placeId;

  const handleMouseEnter = () => {
    if (isAuthenticated) {
      utils.lists.getAll.prefetch();
    }
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

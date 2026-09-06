import { CollectionDetailPage } from '~/components/collections/collection-detail-page';
import { RouteHeader } from '~/components/route-header';

import type { Route } from './+types/collections.$collectionId';

export const meta = () => [{ title: 'Collection' }];

export default function CollectionDetailRoute({ params }: Route.ComponentProps) {
  return (
    <div className="h-full overflow-auto">
      <RouteHeader />
      <CollectionDetailPage collectionId={params.collectionId} />
    </div>
  );
}

import { CollectionsPage } from '~/components/collections/collections-page';
import { RouteHeader } from '~/components/route-header';

import type { Route } from './+types/collections';

export const meta = () => [{ title: 'Collections' }];

// eslint-disable-next-line no-unused-vars -- route module signature requires the typed props param, matches routes/usage.tsx
export default function CollectionsRoute(_: Route.ComponentProps) {
  return (
    <div className="h-full overflow-auto">
      <RouteHeader />
      <CollectionsPage />
    </div>
  );
}

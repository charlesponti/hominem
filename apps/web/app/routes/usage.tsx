import { UsagePage } from '~/components/account/usage-page';
import { RouteHeader } from '~/components/route-header';

import type { Route } from './+types/usage';

export const meta = () => [{ title: 'AI usage' }];

export default function UsageRoute(_: Route.ComponentProps) {
  return (
    <div className="h-full overflow-auto">
      <RouteHeader />
      <UsagePage />
    </div>
  );
}

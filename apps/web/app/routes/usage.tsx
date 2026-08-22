import { UsagePage } from '~/components/account/usage-page';

import type { Route } from './+types/usage';

export const meta = () => [{ title: 'AI usage' }];

export default function UsageRoute(_: Route.ComponentProps) {
  return <UsagePage />;
}

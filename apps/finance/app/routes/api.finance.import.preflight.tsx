import { createImportPreflight } from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.preflight';

export function action({ request }: Route.ActionArgs) {
  return createImportPreflight(request);
}

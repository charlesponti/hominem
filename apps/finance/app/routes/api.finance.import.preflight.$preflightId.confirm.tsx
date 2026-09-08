import { confirmImportPreflight, importUserId } from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.preflight.$preflightId.confirm';

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await importUserId(request);
  if (userId instanceof Response) return userId;
  return confirmImportPreflight(userId, params.preflightId, request);
}

export function loader() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

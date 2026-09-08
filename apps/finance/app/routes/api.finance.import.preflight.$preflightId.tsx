import {
  deleteImportPreflight,
  getImportPreflight,
  importUserId,
} from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.preflight.$preflightId';

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await importUserId(request);
  if (userId instanceof Response) return userId;
  return getImportPreflight(userId, params.preflightId);
}

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== 'DELETE') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  const userId = await importUserId(request);
  if (userId instanceof Response) return userId;
  return deleteImportPreflight(userId, params.preflightId);
}

import {
  deleteImportPreflight,
  getImportPreflight,
  methodNotAllowed,
  withImportUser,
} from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.preflight.$preflightId';

export async function loader({ request, params }: Route.LoaderArgs) {
  return withImportUser(request, (userId) => getImportPreflight(userId, params.preflightId));
}

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== 'DELETE') return methodNotAllowed();
  return withImportUser(request, (userId) => deleteImportPreflight(userId, params.preflightId));
}

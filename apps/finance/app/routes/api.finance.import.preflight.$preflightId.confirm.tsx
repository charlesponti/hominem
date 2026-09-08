import {
  confirmImportPreflight,
  methodNotAllowed,
  withImportUser,
} from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.preflight.$preflightId.confirm';

export async function action({ request, params }: Route.ActionArgs) {
  return withImportUser(request, (userId) =>
    confirmImportPreflight(userId, params.preflightId, request),
  );
}

export const loader = methodNotAllowed;

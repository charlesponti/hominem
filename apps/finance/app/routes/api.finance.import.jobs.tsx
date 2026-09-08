import { listImportJobs, methodNotAllowed, withImportUser } from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.jobs';

export async function loader({ request }: Route.LoaderArgs) {
  return withImportUser(request, listImportJobs);
}

export const action = methodNotAllowed;

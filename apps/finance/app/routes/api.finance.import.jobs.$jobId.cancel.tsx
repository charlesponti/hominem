import { cancelImportJob, methodNotAllowed, withImportUser } from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.jobs.$jobId.cancel';

export async function action({ request, params }: Route.ActionArgs) {
  return withImportUser(request, (userId) => cancelImportJob(userId, params.jobId));
}

export const loader = methodNotAllowed;

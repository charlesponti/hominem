import { cancelImportJob, importUserId } from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.jobs.$jobId.cancel';

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await importUserId(request);
  if (userId instanceof Response) return userId;
  return cancelImportJob(userId, params.jobId);
}

export function loader() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

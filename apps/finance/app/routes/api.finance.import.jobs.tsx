import { importUserId, listImportJobs } from '~/lib/finance/import.server';

import type { Route } from './+types/api.finance.import.jobs';

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await importUserId(request);
  if (userId instanceof Response) return userId;
  return listImportJobs(userId);
}

export function action() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

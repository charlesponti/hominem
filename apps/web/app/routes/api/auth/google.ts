import { jsonResponse } from '~/lib/utils';

import { getServerAuth } from '../../../lib/auth.server';

export async function loader({ request }: { request: Request }) {
  const { user } = await getServerAuth(request);

  if (!user) {
    return jsonResponse({ error: 'Not authenticated' }, { status: 401 });
  }

  return jsonResponse({
    googleTokens: [],
    message: 'Google provider token passthrough is disabled in Better Auth mode.',
  });
}

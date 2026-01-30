import { type LoaderFunctionArgs, redirect } from 'react-router';

import { getServerSession } from '~/lib/auth.server';
import { createServerHonoClient } from '~/lib/trpc/server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, headers } = await getServerSession(request);
  if (!(user && session)) {
    return redirect('/', { headers });
  }

  const trpcClient = createServerHonoClient(session.access_token);

  const res = await trpcClient.api.chats.$get({ query: { limit: '1' } });
  const result = await res.json();

  if (Array.isArray(result) && result.length > 0) {
    return redirect(`/chat/${result[0].id}`, { headers });
  }

  const createRes = await trpcClient.api.chats.$post({
    json: { title: 'New Chat' },
  });
  const createResult = await createRes.json();

  if (!createResult || !createResult.id) {
    return redirect('/', { headers });
  }

  return redirect(`/chat/${createResult.id}`, { headers });
}

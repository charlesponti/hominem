import { type LoaderFunctionArgs, redirect } from 'react-router';

import { getServerSession } from '~/lib/auth.server';
import { createServerTRPCClient } from '~/lib/trpc/server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, headers } = await getServerSession(request);
  if (!(user && session)) {
    return redirect('/', { headers });
  }

  const trpcClient = createServerTRPCClient(session.access_token);

  const res = await trpcClient.api.chats.$get({ query: { limit: '1' } });
  const result = await res.json();

  if (result.success && result.data.length > 0) {
    return redirect(`/chat/${result.data[0].id}`, { headers });
  }

  const createRes = await trpcClient.api.chats.$post({
    json: { title: 'New Chat' },
  });
  const createResult = await createRes.json();

  if (!createResult.success || !createResult.data) {
    return redirect('/', { headers });
  }

  return redirect(`/chat/${createResult.data.id}`, { headers });
}

import { type LoaderFunctionArgs, redirect } from 'react-router';

import { getServerSession } from '~/lib/auth.server';
import { createServerHonoClient } from '~/lib/rpc/server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, headers } = await getServerSession(request);
  if (!(user && session)) {
    return redirect('/', { headers });
  }

  const rpcClient = createServerHonoClient(session.access_token, request);

  const res = await rpcClient.api.chats.$get({ query: { limit: '1' } });
  const result = await res.json();

  if (Array.isArray(result) && result.length > 0) {
    const firstChat = result[0];
    if (firstChat) {
      return redirect(`/chat/${firstChat.id}`, { headers });
    }
  }

  const createRes = await rpcClient.api.chats.$post({
    json: { title: 'New Chat' },
  });
  const createResult = await createRes.json();

  if (!createResult || !createResult.id) {
    return redirect('/', { headers });
  }

  return redirect(`/chat/${createResult.id}`, { headers });
}

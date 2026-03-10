import { type LoaderFunctionArgs, redirect } from 'react-router';

import { createServerHonoClient } from '~/lib/api.server';
import { getServerSession } from '~/lib/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, headers } = await getServerSession(request);
  if (!(user && session)) {
    return redirect('/', { headers });
  }

  const rpcClient = createServerHonoClient(session.access_token, request);

  const result = await rpcClient.chats.list({ limit: 1 });

  if (Array.isArray(result) && result.length > 0) {
    const firstChat = result[0];
    if (firstChat) {
      return redirect(`/chat/${firstChat.id}`, { headers });
    }
  }

  const createResult = await rpcClient.chats.create({ title: 'New Chat' });

  if (!createResult || !createResult.id) {
    return redirect('/', { headers });
  }

  return redirect(`/chat/${createResult.id}`, { headers });
}

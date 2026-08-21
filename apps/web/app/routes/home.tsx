import { redirect } from 'react-router';

import { serverEnv } from '~/lib/env.server';

import type { Route } from './+types/home';

type ChatListItem = { id: string; updatedAt: string };

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get('cookie');
  const headers = cookie ? { cookie } : undefined;
  const apiUrl = serverEnv.HOMINEM_INTERNAL_API_URL;

  const listResponse = await fetch(new URL('/api/chats?limit=1', apiUrl).toString(), { headers });
  const chats = listResponse.ok ? ((await listResponse.json()) as ChatListItem[]) : [];

  if (chats[0]) {
    throw redirect(`/chat/${chats[0].id}`);
  }

  const createResponse = await fetch(new URL('/api/chats', apiUrl).toString(), {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'New chat' }),
  });
  const created = (await createResponse.json()) as { id: string };
  throw redirect(`/chat/${created.id}`);
}

export default function HomePage() {
  return null;
}

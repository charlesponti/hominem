import type { ActionFunctionArgs } from 'react-router'

import { requireAuth } from '~/lib/guards'
import { serverEnv } from '~/lib/env'

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const { session } = await requireAuth(request)
  const chatId = params.chatId

  if (!chatId) {
    return Response.json({ error: 'chatId is required' }, { status: 400 })
  }

  const body = await request.json()
  const upstream = await fetch(`${serverEnv.VITE_PUBLIC_API_URL}/api/chats/${chatId}/ui/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  })
}

import { type LoaderFunctionArgs, redirect } from 'react-router';

import { getServerSession } from '~/lib/auth.server';
import { createServerTRPCClient } from '~/lib/trpc/server';
import { getOrCreateChat } from '~/lib/utils/chat-loader-utils';
import { ChatLoadError, LoaderError } from '~/lib/utils/errors';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, headers } = await getServerSession(request);
  if (!(user && session)) {
    return redirect('/', { headers });
  }

  try {
    const trpcClient = createServerTRPCClient(session.access_token);
    const { chatId } = await getOrCreateChat(trpcClient);
    return redirect(`/chat/${chatId}`, { headers });
  } catch (error) {
    // Convert LoaderError (or subclasses) to Response
    if (error instanceof LoaderError) {
      throw error.toResponse();
    }
    // Wrap unexpected errors as ChatLoadError
    throw new ChatLoadError(
      error instanceof Error ? error.message : 'Failed to load chat',
    ).toResponse();
  }
}

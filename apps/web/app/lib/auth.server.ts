import { getServerAuth as sharedGetServerAuth } from '@hominem/auth/server';

import { serverEnv } from './env';

export const authConfig = {
  apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
};

export const getServerAuth = (request: Request) => sharedGetServerAuth(request, authConfig);

// Convenience wrappers - clients can use getServerAuth directly and destructure what they need
export const getServerSession = async (request: Request) => {
  const { user, session, headers } = await getServerAuth(request);
  return { user, session, headers };
};

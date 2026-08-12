import { getServerAuth as sharedGetServerAuth } from '@ponti-studios/auth/server';

import { serverEnv } from './env.server';

export const authConfig = {
  apiBaseUrl: serverEnv.HOMINEM_INTERNAL_API_URL,
};

const authByRequest = new WeakMap<Request, ReturnType<typeof sharedGetServerAuth>>();

export const getServerAuth = (request: Request) => {
  const cached = authByRequest.get(request);
  if (cached) return cached;
  const auth = sharedGetServerAuth(request, authConfig);
  authByRequest.set(request, auth);
  return auth;
};

// Convenience wrappers - clients can use getServerAuth directly and destructure what they need
export const getServerSession = async (request: Request) => {
  const { user, headers } = await getServerAuth(request);
  return { user, headers };
};

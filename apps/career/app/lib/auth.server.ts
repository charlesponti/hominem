import { getServerAuth as sharedGetServerAuth } from '@ponti-studios/auth/server';
import type { AuthUser as User } from '@ponti-studios/auth/types';

import { serverEnv } from './env.server';

export type { User };

const getServerAuth = (request: Request) =>
  sharedGetServerAuth(request, {
    apiBaseUrl: serverEnv.HOMINEM_INTERNAL_API_URL,
  });

export const getServerSession = async (request: Request) => {
  const { user, headers } = await getServerAuth(request);
  return { user, headers };
};

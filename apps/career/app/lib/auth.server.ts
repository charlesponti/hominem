import { getServerAuth as sharedGetServerAuth } from '@ponti-studios/auth/server';
import type { User } from '@ponti-studios/auth/types';

import { serverEnv } from './env';

export type { User };

const getServerAuth = (request: Request) =>
  sharedGetServerAuth(request, { apiBaseUrl: serverEnv().VITE_PUBLIC_API_URL });

export const getServerSession = async (request: Request) => {
  const { user, headers } = await getServerAuth(request);
  return { user, headers };
};

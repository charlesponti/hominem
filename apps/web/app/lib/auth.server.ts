import { getServerAuth as sharedGetServerAuth } from '@hominem/auth/server';

import { serverEnv } from './env';

export const authConfig = {
  apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
};

export const getServerAuth = (request: Request) => sharedGetServerAuth(request, authConfig);

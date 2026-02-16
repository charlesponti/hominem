import {
  createSupabaseServerClient as sharedCreateSupabaseServerClient,
  getServerAuth as sharedGetServerAuth,
} from '@hominem/auth/server';

import { serverEnv } from './env';

export const authConfig = {
  supabaseUrl: serverEnv.VITE_SUPABASE_URL,
  supabaseAnonKey: serverEnv.VITE_SUPABASE_ANON_KEY,
};

export const getServerAuth = (request: Request) => sharedGetServerAuth(request, authConfig);

export const createSupabaseServerClient = (request: Request) =>
  sharedCreateSupabaseServerClient(request, authConfig);

// Convenience wrappers - clients can use getServerAuth directly and destructure what they need
export const getServerSession = async (request: Request) => {
  const { user, session, headers } = await getServerAuth(request);
  return { user, session, headers };
};

export const getAuthState = async (request: Request) => {
  const { isAuthenticated, headers } = await getServerAuth(request);
  return { isAuthenticated, headers };
};

import type { HominemUser, SupabaseAuthUser } from '@hominem/auth/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Queue } from 'bullmq';
import type { Context, MiddlewareHandler } from 'hono';

import { toHominemUser, UserAuthService } from '@hominem/auth/server';
import { logger } from '@hominem/utils/logger';
import { type CookieMethodsServer, createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { setCookie } from 'hono/cookie';

import { authConfig } from '../lib/auth';

declare module 'hono' {
  interface ContextVariableMap {
    supabase: SupabaseClient;
    user?: HominemUser;
    userId?: string;
    supabaseId: string;
    queues: {
      plaidSync: Queue;
      importTransactions: Queue;
      placePhotoEnrich: Queue;
    };
  }
}

export const getUser = (c: Context) => {
  return c.get('user');
};

export const getUserId = (c: Context) => {
  return c.get('userId');
};

// Service role client for admin operations
export const supabaseClient = createClient(
  authConfig.supabaseUrl,
  authConfig.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function getHominemUser(
  tokenOrUser: string | SupabaseAuthUser,
): Promise<HominemUser | null> {
  try {
    let supabaseUser: SupabaseAuthUser;

    // If token is provided, validate it and get the user
    if (typeof tokenOrUser === 'string') {
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.getUser(tokenOrUser);

      if (error || !user) {
        return null;
      }

      supabaseUser = user as SupabaseAuthUser;
    } else {
      // If SupabaseUser object is provided, use it directly
      supabaseUser = tokenOrUser;
    }

    const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser);
    if (!userAuthData) {
      return null;
    }

    const user = await UserAuthService.getUserById(userAuthData.id);
    return user ? toHominemUser(user) : null;
  } catch (error) {
    logger.error('Error in getHominemUser', { error });
    return null;
  }
}

export const supabaseMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    // Test mode: use x-user-id header for authentication
    if (process.env.NODE_ENV === 'test') {
      const testUserId = c.req.header('x-user-id');
      if (testUserId) {
        c.set('userId', testUserId);
        // For test mode, also set the user object by querying the database
        try {
          const user = await UserAuthService.getUserById(testUserId);
          if (user) {
            const hominemUser = toHominemUser(user);
            c.set('user', hominemUser);
            // Ensure supabaseId is set, defaulting to id if null (legacy behavior support)
            // But since we are migrating, it should ideally be equal
            c.set('supabaseId', hominemUser.supabaseId || hominemUser.id);
          }
        } catch (error) {
          logger.error('Error getting user in test mode', { error });
        }
        await next();
        return;
      }
    }

    const cookieMethods: CookieMethodsServer = {
      getAll() {
        const cookieHeader = c.req.header('Cookie') ?? '';
        const cookies = parseCookieHeader(cookieHeader);
        return cookies
          .filter((cookie): cookie is { name: string; value: string } => cookie.value !== undefined)
          .map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(c, name, value, options as Parameters<typeof setCookie>[3]);
        }
      },
    };

    // Create cookie-based auth client
    const supabase = createServerClient(authConfig.supabaseUrl, authConfig.supabaseAnonKey, {
      cookies: cookieMethods,
    });

    c.set('supabase', supabase);

    // Try to get user from cookie session first (for web apps)
    try {
      const {
        data: { user: cookieUser },
        error: cookieError,
      } = await supabase.auth.getUser();

      if (!cookieError && cookieUser) {
        const hominemUser = await getHominemUser(cookieUser);
        if (hominemUser) {
          c.set('user', hominemUser);
          c.set('userId', hominemUser.id);
          c.set('supabaseId', cookieUser.id);
        }
      }
    } catch (error) {
      logger.error('Error getting user from cookie', { error });
    }

    // If no user from cookie, try to get user from auth header (for API routes)
    // Use service role client for token validation
    if (!c.get('user')) {
      const authHeader = c.req.header('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const hominemUser = await getHominemUser(token);
          if (hominemUser) {
            c.set('user', hominemUser);
            c.set('userId', hominemUser.id);
            c.set('supabaseId', hominemUser.supabaseId);
          }
        } catch (error) {
          logger.error('Error getting user from token', { error });
        }
      }
    }

    await next();
  };
};

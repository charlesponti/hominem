import { UserAuthService } from "@hominem/data";
import { logger } from "@hominem/data/logger";
import {
  type CookieMethodsServer,
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthConfig, ServerAuthResult, SupabaseAuthUser } from "./types";
import { toHominemUser } from "./user";

// Internal type for the cached auth context
type AuthContextCacheValue = {
  user: SupabaseAuthUser | null;
  session: Awaited<ReturnType<SupabaseClient["auth"]["getSession"]>>["data"]["session"] | null;
  supabase: SupabaseClient | null;
  headers: Headers;
};

// Request-scoped cache for Supabase client and headers
type SupabaseClientCacheValue = {
  supabase: SupabaseClient;
  headers: Headers;
};
const supabaseClientCache = new WeakMap<Request, SupabaseClientCacheValue>();

// Request-scoped cache for auth results
// Used to prevent redundant Supabase/DB calls when multiple loaders run in parallel
const authContextCache = new WeakMap<Request, Promise<AuthContextCacheValue>>();

/**
 * Shared internal helper to get auth context for the current request
 */
async function getRequestAuthContext(
  request: Request,
  config: AuthConfig
): Promise<AuthContextCacheValue> {
  const existing = authContextCache.get(request);
  if (existing) return existing;

  const promise = (async (): Promise<AuthContextCacheValue> => {
    let cached = supabaseClientCache.get(request);
    if (!cached) {
      cached = createSupabaseServerClient(request, config);
      supabaseClientCache.set(request, cached);
    }
    const { supabase, headers } = cached;

    try {
      // Security: use getUser() to verify the session is still valid with Supabase
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { user: null, session: null, supabase, headers };
      }

      // After user is verified, get the full session object
      const {
        data: { session },
      } = await supabase.auth.getSession();

      return {
        user: user as SupabaseAuthUser,
        session,
        supabase,
        headers,
      };
    } catch (error) {
      logger.error("[getRequestAuthContext]:", { error });
      // Always use the same headers object for this request
      let cached = supabaseClientCache.get(request);
      if (!cached) {
        cached = createSupabaseServerClient(request, config);
        supabaseClientCache.set(request, cached);
      }
      const { headers } = cached;
      return { user: null, session: null, supabase: null, headers };
    }
  })();

  authContextCache.set(request, promise);
  return promise;
}

/**
 * Get server-side authentication result with Hominem user
 * Returns headers that MUST be included in the response
 */
export async function getServerAuth(
  request: Request,
  config: AuthConfig
): Promise<ServerAuthResult & { headers: Headers }> {
  const { user, session, headers } = await getRequestAuthContext(request, config);

  if (!user || !session) {
    return {
      user: null,
      supabaseUser: null,
      session: null,
      isAuthenticated: false,
      headers,
    };
  }

  const supabaseUser = user as SupabaseAuthUser;

  // Get or create Hominem user
  const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser);
  if (!userAuthData) {
    return {
      user: null,
      supabaseUser: null,
      session: null,
      isAuthenticated: false,
      headers,
    };
  }

  return {
    user: toHominemUser(userAuthData),
    supabaseUser,
    session,
    isAuthenticated: true,
    headers,
  };
}

/**
 * Simple auth state check - returns user and isAuthenticated flag
 */
export async function getAuthState(
  request: Request,
  config: AuthConfig
): Promise<{
  user: SupabaseAuthUser | null;
  isAuthenticated: boolean;
  headers: Headers;
}> {
  const { user, headers } = await getRequestAuthContext(request, config);

  return {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    headers,
  };
}

/**
 * Get server session with user and session objects
 */
export async function getServerSession(
  request: Request,
  config: AuthConfig
): Promise<{
  user: SupabaseAuthUser | null;
  session:
    | Awaited<
        ReturnType<SupabaseClient["auth"]["getSession"]>
      >["data"]["session"]
    | null;
  headers: Headers;
}> {
  const { user, session, headers } = await getRequestAuthContext(request, config);

  return {
    user: user ?? null,
    session,
    headers,
  };
}



/**
 * Create Supabase server client for SSR with proper cookie handling
 */
export function createSupabaseServerClient(
  request: Request,
  config: AuthConfig
): { supabase: SupabaseClient; headers: Headers } {
  let headers = supabaseClientCache.get(request)?.headers;
  if (!headers) headers = new Headers();

  const cookies: CookieMethodsServer = {
    getAll() {
      return parseCookieHeader(request.headers.get("Cookie") ?? "").filter(
        (cookie): cookie is { name: string; value: string } =>
          cookie.value !== undefined
      );
    },
    setAll(
      cookiesToSet: Array<{
        name: string;
        value: string;
        options?: Parameters<typeof serializeCookieHeader>[2];
      }>
    ) {
      cookiesToSet.forEach(({ name, value, options }) => {
        const opts = { ...(options ?? {}), path: '/' };
        headers.append(
          "Set-Cookie",
          serializeCookieHeader(name, value, opts)
        );
      });
    },
  };

  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies,
    }
  );

  return { supabase, headers };
}

// Re-export for consumers importing from '@hominem/auth/server'
export { toHominemUser };

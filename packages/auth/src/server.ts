import { UserAuthService } from "@hominem/data";
import { logger } from "@hominem/data/logger";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthConfig, ServerAuthResult, SupabaseAuthUser } from "./types";
import { toHominemUser } from "./user";

/**
 * Create Supabase server client for SSR with proper cookie handling
 */
export function createSupabaseServerClient(
  request: Request,
  config: AuthConfig = getServerAuthConfig()
): { supabase: SupabaseClient; headers: Headers } {
  const headers = new Headers();
  const isProduction =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  const requestUrl = new URL(request.url);
  const isSecure = requestUrl.protocol === "https:";

  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "") as {
            name: string;
            value: string;
          }[];
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          for (const { name, value, options = {} } of cookiesToSet) {
            // Ensure cookies have proper attributes for persistence across deployments
            const cookieOptions = {
              // Preserve any existing options from Supabase (like maxAge, expires, etc.)
              ...options,
              // Override with required defaults to ensure cookies persist across deployments
              path: typeof options.path === "string" ? options.path : "/",
              sameSite: (["lax", "strict", "none"].includes(
                String(options.sameSite)
              )
                ? options.sameSite
                : "lax") as "lax" | "strict" | "none",
              // Only set secure in production or when using HTTPS
              secure:
                typeof options.secure === "boolean"
                  ? options.secure
                  : isProduction || isSecure,
            };
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(
                name,
                value,
                cookieOptions as Parameters<typeof serializeCookieHeader>[2]
              )
            );
          }
        },
      },
    }
  );

  return { supabase, headers };
}

/**
 * Get server-side authentication result with Hominem user
 * Returns headers that MUST be included in the response
 *
 * @param request - The incoming request object
 * @param config - Optional AuthConfig. If not provided, will auto-read from environment variables
 */
export async function getServerAuth(
  request: Request,
  config?: AuthConfig
): Promise<ServerAuthResult & { headers: Headers }> {
  const authConfig = config ?? getServerAuthConfig();
  const { supabase, headers } = createSupabaseServerClient(request, authConfig);

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return {
        user: null,
        supabaseUser: null,
        session: null,
        isAuthenticated: false,
        headers,
      };
    }

    const supabaseUser = session.user as SupabaseAuthUser;

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

    const hominemUser = toHominemUser(userAuthData);

    return {
      user: hominemUser,
      supabaseUser,
      session,
      isAuthenticated: true,
      headers,
    };
  } catch (error) {
    console.error("Error in getServerAuth:", error);
    return {
      user: null,
      supabaseUser: null,
      session: null,
      isAuthenticated: false,
      headers,
    };
  }
}

export function getServerAuthConfig(): AuthConfig {
  let supabaseUrl: string | undefined;
  let supabaseAnonKey: string | undefined;

  // Try import.meta.env first (Vite/Client/Edge) - use static property access
  // Vite requires static property access like import.meta.env.SUPABASE_URL
  // Access each property directly without storing import.meta in a variable
  // @ts-expect-error - import.meta.env may not be defined in TypeScript but exists at runtime in Vite
  if (typeof import.meta !== "undefined" && import.meta.env) {
    // Access properties directly - Vite needs to see import.meta.env.PROPERTY in source
    supabaseUrl =
      // @ts-expect-error - TypeScript doesn't know about these properties
      import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    supabaseAnonKey =
      // @ts-expect-error - TypeScript doesn't know about these properties
      import.meta.env.SUPABASE_ANON_KEY ||
      // @ts-expect-error - TypeScript doesn't know about these properties
      import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  // Fallback to process.env (Node/Server)
  if (
    (!supabaseUrl || !supabaseAnonKey) &&
    typeof process.env !== "undefined"
  ) {
    supabaseUrl =
      supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    supabaseAnonKey =
      supabaseAnonKey ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

/**
 * Simple auth state check - returns user and isAuthenticated flag
 * Use this when you only need to know if a user is authenticated
 * Returns headers that MUST be included in the response
 */
export async function getAuthState(request: Request): Promise<{
  user: SupabaseAuthUser | null;
  isAuthenticated: boolean;
  headers: Headers;
}> {
  const { supabase, headers } = createSupabaseServerClient(request);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error fetching user in auth loader:", userError);
    }

    return {
      user: user ?? null,
      isAuthenticated: Boolean(user),
      headers,
    };
  } catch (error) {
    console.error("Error in getAuthState:", error);
    return {
      user: null,
      isAuthenticated: false,
      headers,
    };
  }
}

/**
 * Get server session with user and session objects
 * Use this when you need the session for API tokens or full user/session data
 * Returns headers that MUST be included in the response
 */
export async function getServerSession(request: Request): Promise<{
  user: SupabaseAuthUser | null;
  session:
    | Awaited<
        ReturnType<SupabaseClient["auth"]["getSession"]>
      >["data"]["session"]
    | null;
  headers: Headers;
}> {
  const { supabase, headers } = createSupabaseServerClient(request);

  try {
    // Verify user authentication first
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, session: null, headers };
    }

    // Get session for tokens after verifying user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return { user: null, session: null, headers };
    }

    return { user, session, headers };
  } catch (error) {
    logger.error("[getServerSession]:", { error });
    return { user: null, session: null, headers };
  }
}

// Re-export for consumers importing from '@hominem/auth/server'
export { toHominemUser };

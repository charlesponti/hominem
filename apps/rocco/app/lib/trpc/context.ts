import { createSupabaseServerClient } from "../auth.server";
import { UserAuthService, type UserSelect } from "@hominem/data";
import { initTRPC, TRPCError } from "@trpc/server";
import { logger } from "../logger";

export interface Context {
  user?: UserSelect | null;
  responseHeaders: Headers;
}

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  return token.length ? token : null;
}

// Validate token directly via Supabase (no Redis caching) to mirror Notes behavior
async function validateToken(request: Request) {
  const token = extractBearerToken(request);
  const { supabase, headers } = createSupabaseServerClient(request);

  try {
    if (token) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return { user: null, headers };
      }

      return { user, headers };
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, headers };
    }

    return { user, headers };
  } catch (error) {
    logger.error("Error validating token", { error: error as Error });
    return { user: null, headers };
  }
}

export const createContext = async (request?: Request): Promise<Context> => {
  const responseHeaders = new Headers();

  if (!request) {
    return { user: null, responseHeaders };
  }

  try {
    if (process.env.NODE_ENV === "test") {
      const testUserId = request.headers.get("x-user-id");
      if (testUserId) {
        const localUser = await UserAuthService.findByIdOrEmail({
          id: testUserId,
        });
        return { user: localUser ?? null, responseHeaders };
      }
    }

    const { user: supabaseUser, headers: authHeaders } = await validateToken(
      request
    );

    // Copy auth headers (cookies) to response headers
    authHeaders.forEach((value, key) => {
      responseHeaders.append(key, value);
    });

    if (!supabaseUser) {
      return { user: null, responseHeaders };
    }

    try {
      const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser);
      return { user: userAuthData ?? null, responseHeaders };
    } catch (dbError) {
      logger.error("Failed to find or create user in local DB", {
        error: dbError as Error,
        supabaseId: supabaseUser.id,
      });
      return { user: null, responseHeaders };
    }
  } catch (error) {
    logger.error("Error verifying auth token", { error: error as Error });
    return { user: null, responseHeaders };
  }
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  if (!ctx.user.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAdmin);

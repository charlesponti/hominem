import { createSupabaseServerClient } from "@hominem/auth/server";
import { UserAuthService, type UserSelect } from "@hominem/data";
import { initTRPC, TRPCError } from "@trpc/server";
import { logger } from "../logger";

export interface Context {
  user?: UserSelect | null;
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
  const { supabase } = createSupabaseServerClient(request);

  try {
    if (token) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      return user;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    logger.error("Error validating token", { error: error as Error });
    return null;
  }
}

export const createContext = async (request?: Request): Promise<Context> => {
  if (!request) {
    return { user: null };
  }

  try {
    if (process.env.NODE_ENV === "test") {
      const testUserId = request.headers.get("x-user-id");
      if (testUserId) {
        const localUser = await UserAuthService.findByIdOrEmail({
          id: testUserId,
        });
        return { user: localUser ?? null };
      }
    }

    const supabaseUser = await validateToken(request);

    if (!supabaseUser) {
      return { user: null };
    }

    try {
      const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser);
      return { user: userAuthData ?? null };
    } catch (dbError) {
      logger.error("Failed to find or create user in local DB", {
        error: dbError as Error,
        supabaseId: supabaseUser.id,
      });
      return { user: null };
    }
  } catch (error) {
    logger.error("Error verifying auth token", { error: error as Error });
    return { user: null };
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

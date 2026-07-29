import type { User } from '@hominem/auth/types';
import { authDb } from '@hominem/db';
import type { MiddlewareHandler } from 'hono';

import { betterAuthMcpServer, betterAuthServer } from '../auth/better-auth';
import type { AuthContext } from '../auth/types';

type AuthErrorCode = 'invalid_token' | 'expired_token' | 'invalid_session';

declare module 'hono' {
  interface ContextVariableMap {
    auth?: AuthContext;
    authError?: AuthErrorCode;
  }
}

function toAuthUser(user: {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    image: user.image ?? null,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
  };
}

function isMcpRequest(path: string) {
  return path === '/api/mcp' || path.startsWith('/api/mcp/');
}

async function getUser(userId: string): Promise<User | null> {
  return (
    (await authDb.selectFrom('user').selectAll().where('id', '=', userId).executeTakeFirst()) ??
    null
  );
}

function setAuthContext(c: Parameters<MiddlewareHandler>[0], input: AuthContext) {
  c.set('auth', input);
}

/**
 * Resolve the caller identity once at the API boundary. Route-specific middleware
 * may authorize the resolved context, but must not establish a second identity.
 */
export const authMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const path = c.req.path;
    if (path.startsWith('/api/auth')) {
      return await next();
    }

    if (isMcpRequest(path) && c.req.header('authorization')) {
      const mcpSession = await betterAuthMcpServer.api.getMcpSession({
        headers: c.req.raw.headers,
      });

      if (mcpSession) {
        const user = await getUser(mcpSession.userId);
        if (user) {
          setAuthContext(c, {
            user,
            userId: user.id,
            credential: 'mcp-oauth',
            scopes: mcpSession.scopes.split(' ').filter(Boolean),
          });
          return await next();
        }
      }
    }

    const betterAuthSession = await betterAuthServer.api.getSession({
      headers: c.req.raw.headers,
    });

    const userId = betterAuthSession?.user?.id;
    const sessionId = betterAuthSession?.session?.id;

    if (userId && sessionId) {
      setAuthContext(c, {
        user: toAuthUser(betterAuthSession.user),
        userId,
        sessionId,
        credential: 'session',
        scopes: [],
      });
      return await next();
    }

    return await next();
  };
};

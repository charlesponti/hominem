import type { User } from '@hominem/auth/types';

export type AuthCredential = 'session' | 'mcp-oauth';
export type AuthUser = User & { isAdmin?: boolean };

export interface AuthContext {
  user: AuthUser;
  userId: string;
  sessionId?: string;
  clientId?: string;
  credential: AuthCredential;
  scopes: string[];
}

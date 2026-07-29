import type { User } from '@ponti-studios/auth/types';

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

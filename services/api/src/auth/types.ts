import type { JWTPayload } from 'jose';

export interface AccessTokenClaims extends JWTPayload {
  sub: string;
  sid: string;
  scope: string[];
  role: 'user' | 'admin';
  amr: string[];
  auth_time: number;
}

export interface AuthContextEnvelope {
  sub: string;
  sid: string;
  scope: string[];
  role: 'user' | 'admin';
  amr: string[];
  authTime: number;
}

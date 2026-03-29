export interface AuthContextEnvelope {
  sub: string;
  sid: string;
  amr: string[];
  authTime: number;
}

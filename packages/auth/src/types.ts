export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

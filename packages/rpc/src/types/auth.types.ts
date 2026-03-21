export type AuthTokenPayload = {
  sub: string
  exp?: number | undefined
  iat?: number | undefined
  email?: string | undefined
}

export type AuthSession = {
  accessToken: string
  refreshToken?: string | undefined
  expiresAt?: number | undefined
  userId: string
}

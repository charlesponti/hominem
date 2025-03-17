export const getEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} environment variable not set`)
  }
  return value
}

export const validateEnvironmentVariables = () => {
  // Clerk
  getEnv('CLERK_SECRET_KEY')
  getEnv('CLERK_PUBLISHABLE_KEY')
}

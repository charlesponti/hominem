export const getEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} environment variable not set`)
  }
  return value
}

export const validateEnvironmentVariables = () => {
  getEnv('PINECONE_API_KEY')
  getEnv('PINECONE_INDEX')
  getEnv('PINECONE_CLOUD')
  getEnv('PINECONE_REGION')
}

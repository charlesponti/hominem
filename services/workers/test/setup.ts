// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test'

// Mock required env vars for services package (loaded before tests)
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-openrouter-key'
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-google-key'
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:4433/hominem-test'
process.env.DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
process.env.APP_BASE_URL = process.env.APP_BASE_URL || 'https://example.com'

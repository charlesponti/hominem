// test helper: ensure required env vars are present before any module loads them
process.env.APP_BASE_URL = process.env.APP_BASE_URL || 'https://example.com';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost/test';
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-key';
process.env.R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://example.com';
process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'fake';
process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'fake';

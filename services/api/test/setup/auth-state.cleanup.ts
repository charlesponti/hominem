import { db, pool } from '@hominem/db'

const EXACT_TEST_EMAILS = [
  'mobile-e2e@hominem.test',
  'mobile-passkey-e2e@hominem.test',
  'step-up-existing@hominem.test',
  'step-up-first-time@hominem.test',
]

const TEST_EMAIL_PATTERNS = [
  'otp-%@hominem.test',
  'cli-device-%@hominem.test',
  'session-store-%@hominem.test',
]

const TEST_DEVICE_CLIENT_IDS = ['hominem-cli']
const AUTH_REDIS_PATTERNS = ['auth:session:sid:*', 'auth:revoked:sid:*', 'ratelimit:auth:*']

interface UserRow {
  id: string
}

async function deleteMatchingRedisKeys(
  redis: Awaited<typeof import('../../../../packages/services/src/redis')>['redis'],
  pattern: string,
) {
  let cursor = '0'

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    cursor = nextCursor
  } while (cursor !== '0')
}

async function selectAuthTestUserIds() {
  const result = await pool.query<UserRow>(
    `
      select id
      from users
      where lower(email) = any($1::text[])
        or lower(email) like any($2::text[])
    `,
    [EXACT_TEST_EMAILS, TEST_EMAIL_PATTERNS],
  )

  return result.rows.map((row) => row.id)
}

async function cleanupDeviceCodes(userIds: string[]) {
  if (userIds.length > 0) {
    await db.deleteFrom('user_device_code').where('user_id', 'in', userIds).execute()
  }

  await pool.query(
    `
      delete from user_device_code
      where client_id = any($1::text[])
    `,
    [TEST_DEVICE_CLIENT_IDS],
  )
}

async function cleanupVerificationRows() {
  await pool.query(
    `
      delete from user_verification
      where lower(identifier) = any($1::text[])
        or lower(identifier) like any($2::text[])
    `,
    [EXACT_TEST_EMAILS, TEST_EMAIL_PATTERNS],
  )
}

async function cleanupUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return
  }

  await db.deleteFrom('users').where('id', 'in', userIds).execute()
}

export async function cleanupApiAuthTestState() {
  const userIds = await selectAuthTestUserIds()

  await cleanupDeviceCodes(userIds)
  await cleanupVerificationRows()
  await cleanupUsers(userIds)
}

export async function cleanupApiAuthRedisState() {
  try {
    const { redis } = await import('../../../../packages/services/src/redis')
    for (const pattern of AUTH_REDIS_PATTERNS) {
      await deleteMatchingRedisKeys(redis, pattern)
    }
  } catch {
    // Cleanup is best-effort when Redis is unavailable in local runs.
  }
}
export async function getRedis() {
  return (await import('@hominem/services/redis')).redis;
}

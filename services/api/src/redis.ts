type RateLimitRedis = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
};

export async function getRedis(): Promise<RateLimitRedis> {
  return (await import('@hominem/services/redis')).redis;
}

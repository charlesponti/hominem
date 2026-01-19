export const placeCache = new (class LocalCache<T> {
  private map = new Map<string, { value: T; expiresAt?: number }>();
  TTL_SHORT_MS = 1000 * 60 * 5;

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    this.map.set(key, { value, expiresAt });
  }

  delete(key: string) {
    this.map.delete(key);
  }
})();

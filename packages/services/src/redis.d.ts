import Redis from 'ioredis';
export declare const redis: Redis;
export declare function checkRateLimit(key: string): Promise<boolean>;
export declare function waitForRateLimit(key: string): Promise<void>;
//# sourceMappingURL=redis.d.ts.map

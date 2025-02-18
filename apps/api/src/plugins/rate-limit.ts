import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Redis } from "ioredis";

interface RateLimitOptions {
	redis: Redis;
	getCustomError?: (request: FastifyRequest, key: string) => Error;
	maxHits: number;
	onRateLimit?: (request: FastifyRequest, key: string) => void;
	segment: string;
	windowLength: number;
}

const rateLimitPlugin: FastifyPluginAsync<RateLimitOptions> = async (
	fastify,
	opts,
) => {
	const noop = () => {};
	const {
		redis,
		getCustomError,
		maxHits,
		onRateLimit = noop,
		segment: keyPrefix,
		windowLength: expInMilliseconds,
	} = opts;

	async function verifyKeyExpiration(cacheKey: string) {
		const ttl = await redis.ttl(cacheKey);
		const expirationMissing = ttl === -1;
		if (expirationMissing) {
			await redis.expire(cacheKey, expInMilliseconds / 1000);
		}
	}

	async function rateLimit(request: FastifyRequest, key: string) {
		const cacheKey = `${keyPrefix}::${key}`;

		const UNAVAILABLE_REDIS_STATUSES = ["reconnecting", "error"];

		if (UNAVAILABLE_REDIS_STATUSES.includes(redis.status)) {
			return;
		}

		let rateLimitError = null;
		try {
			const cachedValue = await redis.get(cacheKey);

			if (cachedValue === null) {
				// Set expiration time for the key
				await redis.set(cacheKey, 1, "PX", expInMilliseconds);
				return;
			}

			const valueToInt = Number.parseInt(cachedValue, 10);
			const counter = Number.isNaN(valueToInt) ? 0 : valueToInt;

			if (counter >= maxHits) {
				await verifyKeyExpiration(cacheKey);
				onRateLimit(request, key);

				if (!getCustomError) {
					throw new Error("Rate limit exceeded");
				}

				rateLimitError = getCustomError(request, key);
			} else if (cachedValue) {
				await Promise.all([
					redis.incr(cacheKey),
					verifyKeyExpiration(cacheKey),
				]);
			} else {
				await redis.set(cacheKey, counter + 1, "PX", expInMilliseconds);
			}
		} catch (error) {
			// Unexpected error probably means Redis shortage
			// Rate limit is temporarily disabled
		}

		if (rateLimitError) {
			throw rateLimitError;
		}
	}

	fastify.decorate("rateLimit", rateLimit);
	fastify.register(require("@fastify/rate-limit"), opts);
};

export default fp(rateLimitPlugin, {
	name: "rate-limit",
});

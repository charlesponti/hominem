import Redis from "ioredis";

const { REDIS_URL } = process.env;
if (!REDIS_URL) {
	console.log(REDIS_URL);
	console.log(process.env.DATABASE_URL);
	throw new Error("Missing REDIS_URL");
}

export const redis = new Redis(REDIS_URL || "redis://localhost:6379");

import Redis from "ioredis";

const { REDIS_URL } = process.env;
if (!REDIS_URL) {
	throw new Error("Missing REDIS_URL");
}

export const redis = new Redis(`${REDIS_URL}?family=0`);

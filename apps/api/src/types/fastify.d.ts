import type { Redis } from "ioredis";

declare module "fastify" {
	interface FastifyInstance {
		redis: Redis;
	}
}

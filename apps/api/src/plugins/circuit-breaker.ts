import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export default fp(async (server: FastifyInstance) => {
	server.register(require("@fastify/circuit-breaker"));
});

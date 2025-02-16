import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

// Status/health endpoint
const statusPlugin: FastifyPluginAsync = async (server) => {
	server.get("/status", async (request) => {
		const session = request.session.get("data");
		const isAuth = session && !!session.userId;

		const serverTime = new Date().toISOString();
		const uptime = process.uptime();

		return { up: true, isAuth, serverTime, uptime };
	});
};

export default fp(statusPlugin);

import type { FastifyPluginAsync } from "fastify";
import authenticatePlugin from "./authenticate";
import loginPlugin from "./login";
import logoutPlugin from "./logout";

const authPlugin: FastifyPluginAsync = async (server) => {
	await server.register(loginPlugin);
	await server.register(authenticatePlugin);
	await server.register(logoutPlugin);
};

export default authPlugin;

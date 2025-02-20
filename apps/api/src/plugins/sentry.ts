import * as Sentry from "@sentry/node";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const { SENTRY_DSN, SENTRY_DEBUG, NODE_ENV } = process.env as Record<
	string,
	string
>;

const shutdownPlugin: FastifyPluginAsync = fp(async (server) => {
	Sentry.init({
		dsn: SENTRY_DSN,
		environment: NODE_ENV,
		enabled: !!SENTRY_DSN,
		debug: !!SENTRY_DEBUG,
		tracesSampleRate: 1,
	});

	Sentry.addIntegration(Sentry.httpIntegration({ spans: true }));

	server.addHook("onError", (request, reply, error, done) => {
		Sentry.withScope((scope) => {
			scope.setTags({
				path: request?.raw.url ?? "Not available",
			});
			scope.setExtras({
				"request ID": request?.id,
			});
			Sentry.captureException(error);
		});

		done();
	});

	server.addHook("onRequest", (req, res, next) => {
		req.log.trace("start sentry request transaction");
		const transaction = Sentry.startInactiveSpan({
			name: "HTTP request handler",
		});
		res.raw.on("finish", () => {
			req.log.trace("finish sentry request transaction");
			transaction?.end();
		});
		next();
	});
});

export default shutdownPlugin;

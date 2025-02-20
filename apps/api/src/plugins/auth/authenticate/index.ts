import { db } from "@ponti/utils/db";
import { token, users } from "@ponti/utils/schema";
import { and, eq, gt } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { userService } from "../../../services/user.service";

export enum TOKEN_FAILURE_REASONS {
	NOT_FOUND = "Token not found",
	INVALID = "Token is invalid",
	EXPIRED = "Token has expired",
	EMAIL_MISMATCH = "Email does not match",
}

interface AuthenticateInput {
	email: string;
	emailToken: string;
}

interface AuthenticateResponse {
	user: {
		isAdmin: boolean;
		roles: string[];
		userId: string;
		name: string | null;
	};
}

const authenticateSchema = z.object({
	email: z.string().email(),
	emailToken: z.string(),
});

async function validateEmailToken(t: string, email: string) {
	const [fetchedToken] = await db
		.select()
		.from(token)
		.where(
			and(
				eq(token.emailToken, t),
				gt(token.expiration, new Date().toISOString()),
			),
		)
		.leftJoin(users, eq(token.userId, users.id));

	if (!fetchedToken) {
		return null;
	}

	return fetchedToken;
}

const authenticatePlugin: FastifyPluginAsync = async (server) => {
	server.addHook("preHandler", async (request) => {
		request.id = randomUUID();
		request.log.info(
			{ requestId: request.id },
			"Incoming authentication request",
		);
	});
	const fo = "1234";
	server.post<{
		Body: AuthenticateInput;
		Reply: AuthenticateResponse | { error: string };
	}>(
		"/authenticate",
		{
			schema: {
				// body: {
				// 	type: "object",
				// 	required: ["email", "emailToken"],
				// 	properties: {
				// 		email: { type: "string" },
				// 		emailToken: { type: "string" },
				// 	},
				// },
				response: {
					200: {
						type: "object",
						required: ["user"],
						properties: {
							user: {
								type: "object",
								required: ["isAdmin", "roles", "userId", "name"],
								properties: {
									isAdmin: { type: "boolean" },
									roles: { type: "array", items: { type: "string" } },
									userId: { type: "string" },
									name: { type: ["string", "null"] },
								},
							},
						},
					},
					"4xx": {
						type: "object",
						required: ["error"],
						properties: {
							error: { type: "string" },
						},
					},
				},
			},
		},
		async (request, reply) => {
			try {
				const { email, emailToken } = authenticateSchema.parse(request.body);
				const fetchedEmailToken = await validateEmailToken(emailToken, email);

				if (!fetchedEmailToken) {
					request.log.error(
						{ email, emailToken, requestId: request.id },
						"Invalid or expired token",
					);
					return reply.code(401).send({ error: "Invalid or expired token" });
				}

				if (!fetchedEmailToken.users) {
					request.log.error(
						{ email, emailToken, requestId: request.id },
						"No user found matching token",
					);
					return reply
						.code(401)
						.send({ error: "No user found matching token" });
				}

				const tokenBase = {
					isAdmin: fetchedEmailToken.users.isAdmin,
					roles: ["user", !!fetchedEmailToken.users.isAdmin && "admin"].filter(
						Boolean,
					),
					userId: fetchedEmailToken.users.id,
				};

				const accessToken = server.jwt.sign(tokenBase);

				const newUser = await userService.createOrUpdateUser(
					email,
					accessToken,
				);

				return reply.send({
					user: {
						isAdmin: newUser.isAdmin,
						roles: tokenBase.roles,
						userId: newUser.id,
						name: newUser.name,
					},
				});
			} catch (error) {
				request.log.error(
					{ error, requestId: request.id },
					"Authentication failed",
				);

				if (error instanceof z.ZodError) {
					return reply.code(400).send({ error: "Invalid input data" });
				}

				return reply.code(500).send({ error: "Internal server error" });
			}
		},
	);
};

export default authenticatePlugin;

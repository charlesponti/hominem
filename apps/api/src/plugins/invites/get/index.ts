import { db } from "@ponti/utils";
import { list, listInvite, users } from "@ponti/utils/schema";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { RequestWithSession } from "../../../typings";
import { verifySession } from "../../auth/utils";

const getUserInvitesRoute = (server: FastifyInstance) => {
	server.get(
		"/invites",
		{
			preValidation: verifySession,
			schema: {
				response: {
					200: {
						type: "array",
						items: {
							type: "object",
							properties: {
								accepted: { type: "boolean" },
								listId: { type: "string" },
								invitedUserEmail: { type: "string" },
								invitedUserId: { type: "string" },
								// The user who created the invite
								list: {
									type: "object",
									properties: {
										id: { type: "string" },
										name: { type: "string" },
									},
								},
								user: {
									type: "object",
									properties: {
										id: { type: "string" },
										email: { type: "string" },
										name: { type: "string" },
									},
								},
								createdAt: { type: "string" },
								updatedAt: { type: "string" },
							},
						},
					},
				},
			},
		},
		async (request: RequestWithSession, reply) => {
			const { userId } = request.session.get("data");
			const invites = await db
				.select()
				.from(listInvite)
				.where(
					and(
						eq(listInvite.invitedUserId, userId),
						eq(listInvite.accepted, false),
					),
				)
				.leftJoin(list, eq(list.id, listInvite.listId))
				.leftJoin(users, eq(users.id, listInvite.userId))
				.orderBy(asc(listInvite.listId));

			return reply.status(200).send(invites);
		},
	);

	server.get(
		"/invites/outgoing",
		{
			preValidation: verifySession,
			schema: {
				response: {
					200: {
						type: "array",
						items: {
							type: "object",
							properties: {
								accepted: { type: "boolean" },
								listId: { type: "string" },
								invitedUserEmail: { type: "string" },
								invitedUserId: { type: "string" },
								// The user who created the invite
								user: {
									type: "object",
									properties: {
										id: { type: "string" },
										email: { type: "string" },
										name: { type: "string" },
									},
								},
								createdAt: { type: "string" },
								updatedAt: { type: "string" },
							},
						},
					},
				},
			},
		},
		async (request: RequestWithSession, reply) => {
			const { userId } = request.session.get("data");
			const invites = await db
				.select()
				.from(listInvite)
				.where(and(eq(listInvite.userId, userId)));

			return reply.status(200).send(invites);
		},
	);
};

export default getUserInvitesRoute;

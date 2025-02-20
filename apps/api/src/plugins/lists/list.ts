import { db, takeUniqueOrThrow } from "@ponti/utils";
import { item, list, place } from "@ponti/utils/schema";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { verifySession } from "../auth/utils";

/**
 * Fetches all places associated with a specific list
 * @param listId - The ID of the list to fetch places for
 */
async function getListPlaces(listId: string) {
	const listPlaces = await db
		.select({
			id: item.id,
			itemId: item.itemId,
			description: place.description,
			itemAddedAt: item.createdAt,
			googleMapsId: place.googleMapsId,
			name: place.name,
			imageUrl: place.imageUrl,
			types: place.types,
			type: item.type,
		})
		.from(item)
		.innerJoin(place, eq(item.itemId, place.id))
		.where(eq(item.listId, listId));

	return listPlaces;
}

export const getListRoute = (server: FastifyInstance) => {
	server.get(
		"/lists/:id",
		{
			preValidation: verifySession,
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string" },
					},
					required: ["id"],
				},
				response: {
					200: {
						type: "object",
						properties: {
							id: { type: "string" },
							name: { type: "string" },
							createdAt: { type: "string" },
							updatedAt: { type: "string" },
							userId: { type: "string" },
							items: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string" },
										itemId: { type: "string" },
										description: { type: "string", nullable: true },
										itemAddedAt: { type: "string" },
										googleMapsId: { type: "string", nullable: true },
										name: { type: "string" },
										imageUrl: { type: "string", nullable: true },
										type: { type: "string" },
										types: {
											type: "array",
											items: { type: "string" },
											nullable: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			const found = await db
				.select()
				.from(list)
				.where(eq(list.id, id))
				.then(takeUniqueOrThrow);

			if (!found) {
				return reply.status(404).send({ message: "List not found" });
			}

			const listItems = await getListPlaces(id);

			return { ...found, items: listItems, userId: found.userId };
		},
	);
};

export const deleteListItemRoute = (server: FastifyInstance) => {
	server.delete(
		"/lists/:listId/items/:itemId",
		{
			preValidation: verifySession,
			schema: {
				params: {
					type: "object",
					properties: {
						listId: { type: "string" },
						itemId: { type: "string" },
					},
					required: ["listId", "itemId"],
				},
			},
		},
		async (request, reply) => {
			const { listId, itemId } = request.params as {
				itemId: string;
				listId: string;
			};

			await db
				.delete(item)
				.where(and(eq(item.listId, listId), eq(item.itemId, itemId)));

			return reply.status(204).send();
		},
	);
};

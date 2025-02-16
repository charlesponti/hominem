import { list, token, users } from "@ponti/utils/schema";
import { add } from "date-fns";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db";

export class UserService {
	async createOrUpdateUser(email: string, accessToken: string) {
		return await db.transaction(async (t) => {
			const existingUser = await t
				.select()
				.from(users)
				.where(eq(users.email, email))
				.execute();

			if (existingUser.length > 0) {
				return existingUser[0];
			}

			const [createdUser] = await t
				.insert(users)
				.values({
					id: randomUUID(),
					email,
				})
				.returning();

			await Promise.all([
				t.insert(list).values({
					id: randomUUID(),
					name: "General",
					userId: createdUser.id,
				}),
				t.insert(token).values({
					userId: createdUser.id,
					type: "API",
					accessToken,
					refreshToken: randomUUID(),
					expiration: add(new Date(), { hours: 12 }).toISOString(),
				}),
			]);

			return createdUser;
		});
	}
}

export const userService = new UserService();

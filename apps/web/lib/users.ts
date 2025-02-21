import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@ponti/utils/db";
import { users } from "@ponti/utils/schema";
import { eq } from "drizzle-orm";

export async function getHominemUser() {
	const { userId, sessionClaims } = await auth();

	if (!userId) {
		return { user: null, sessionClaims };
	}

	const [user] = await db.select().from(users).where(eq(users.clerkId, userId));

	if (userId && !user) {
		const clerkUser = await currentUser();
		if (!clerkUser) {
			return { user: null, sessionClaims };
		}
		const [newUser] = await db.insert(users).values({
			id: crypto.randomUUID(),
			email: clerkUser.emailAddresses[0].emailAddress,
			clerkId: userId,
		});
		return { user: newUser, sessionClaims };
	}

	return { user, sessionClaims };
}

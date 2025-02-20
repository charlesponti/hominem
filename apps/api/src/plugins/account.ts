import { db } from "@ponti/utils/db";
import { account } from "@ponti/utils/schema";
import { eq } from "drizzle-orm";

export function getUserAccount(userId: string) {
	return db.select().from(account).where(eq(account.userId, userId)).limit(1);
}

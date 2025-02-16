import { account } from "@ponti/utils/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export function getUserAccount(userId: string) {
	return db.select().from(account).where(eq(account.userId, userId)).limit(1);
}

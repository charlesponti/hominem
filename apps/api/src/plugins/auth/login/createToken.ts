import { db } from "@ponti/utils";
import { token, users } from "@ponti/utils/schema";
import { add } from "date-fns";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { APP_USER_ID, EVENTS, track } from "../../../analytics";
import { sendEmailToken } from "../../email";

const EMAIL_TOKEN_EXPIRATION_MINUTES = 10;

// Generate a random 8 digit number as the email token
function generateEmailToken(): string {
	return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function createToken({
	email,
	server,
}: {
	email: string;
	server: FastifyInstance;
}) {
	// 👇 Generate an alphanumeric token
	const emailToken = generateEmailToken();

	// 👇 Create a date object for the email token expiration
	const tokenExpiration = add(new Date(), {
		minutes: EMAIL_TOKEN_EXPIRATION_MINUTES,
	});

	let [user] = await db.select().from(users).where(eq(users.email, email));

	if (!user) {
		// 👇 create a new user if they don't exist
		const [newUser] = await db
			.insert(users)
			.values({
				id: crypto.randomUUID(),
				email,
			})
			.returning();
		user = newUser;
	}

	// 👇 create a short lived token and update user or create if they don't exist
	await db.insert(token).values({
		emailToken,
		type: "EMAIL",
		expiration: tokenExpiration.toISOString(),
		userId: user.id,
	});

	track(APP_USER_ID, EVENTS.USER_EVENTS.REGISTER_SUCCESS, {});

	try {
		// 👇 Send the email token
		await sendEmailToken(email, emailToken);
	} catch (error) {
		server.log.error("Error sending email token", error);
		throw new Error("Error sending email token");
	}
}

export { createToken };

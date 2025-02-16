import { db } from "@ponti/utils";
import { token, users } from "@ponti/utils/schema";
import { eq } from "drizzle-orm";
import { TOKEN_FAILURE_REASONS } from "./index";

export class TokenValidationError extends Error {
	constructor(
		public reason: (typeof TOKEN_FAILURE_REASONS)[keyof typeof TOKEN_FAILURE_REASONS],
	) {
		super(reason);
	}
}

export async function validateEmailToken(emailToken: string, email: string) {
	const tokenResults = await db
		.selectDistinct()
		.from(token)
		.where(eq(token.emailToken, emailToken))
		.leftJoin(users, eq(users.id, token.userId));

	if (!tokenResults?.[0]) {
		throw new TokenValidationError(TOKEN_FAILURE_REASONS.NOT_FOUND);
	}

	const [fetchedEmailToken] = tokenResults;

	if (!fetchedEmailToken.token.valid) {
		throw new TokenValidationError(TOKEN_FAILURE_REASONS.INVALID);
	}

	if (new Date(fetchedEmailToken.token.expiration) < new Date()) {
		throw new TokenValidationError(TOKEN_FAILURE_REASONS.EXPIRED);
	}

	if (!fetchedEmailToken.users || fetchedEmailToken.users.email !== email) {
		throw new TokenValidationError(TOKEN_FAILURE_REASONS.EMAIL_MISMATCH);
	}

	return fetchedEmailToken;
}

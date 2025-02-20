import { initTRPC } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const t = initTRPC.create();

const emailAddressSchema = z.object({
	id: z.string(),
	uuidEmail: z.string().email(),
	userId: z.string(),
	isActive: z.boolean(),
});

type EmailAddress = z.infer<typeof emailAddressSchema>;

export class EmailMaskRouter {
	private emailAddresses: EmailAddress[] = [];
	private emailDomain: string;

	constructor(emailDomain: string) {
		this.emailDomain = emailDomain;
		if (!emailDomain) {
			throw new Error("Email domain must be provided.");
		}
	}

	public router = t.router({
		generateEmail: t.procedure
			.input(z.object({ userId: z.string() }))
			.mutation(({ input }) => {
				const uuid = randomUUID();
				const newEmail: EmailAddress = {
					id: randomUUID(),
					uuidEmail: `${uuid}@${this.emailDomain}`,
					userId: input.userId,
					isActive: true,
				};
				this.emailAddresses.push(newEmail);
				return newEmail;
			}),

		deactivateEmail: t.procedure
			.input(z.object({ id: z.string() }))
			.mutation(({ input }) => {
				const index = this.emailAddresses.findIndex(
					(email) => email.id === input.id,
				);
				if (index === -1) return false;
				this.emailAddresses[index].isActive = false;
				return true;
			}),

		getEmailById: t.procedure
			.input(z.object({ id: z.string() }))
			.query(({ input }) => {
				return this.emailAddresses.find((email) => email.id === input.id);
			}),

		getEmailsByUserId: t.procedure
			.input(z.object({ userId: z.string() }))
			.query(({ input }) => {
				return this.emailAddresses.filter(
					(email) => email.userId === input.userId && email.isActive,
				);
			}),
	});
}

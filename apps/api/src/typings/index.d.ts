import * as FastifyJwt from "@fastify/jwt";
import type { MultipartFile } from "@fastify/multipart";
import type { Session, SessionData } from "@fastify/secure-session";
import type { User } from "@ponti/utils/schema";
import type { MailService } from "@sendgrid/mail";
import type { FastifyRequest } from "fastify";

export type RequestWithSession = FastifyRequest & {
	session: {
		get(key: "data"): SessionData["data"];
		delete(): void;
	};
};

declare module "@fastify/secure-session" {
	interface SessionData {
		data: {
			name: string | null;
			userId: string;
			isAdmin: boolean;
			roles: string[];
		};
	}
}

declare module "fastify" {
	interface FastifyInstance extends FastifyServerFactory {
		getUserId: (FastifyRequest) => string;
		sendgrid: MailService;
		sendEmail: (
			email: string,
			subject: string,
			text: string,
			html: string,
		) => Promise<void>;
		sendEmailToken: (email: string, emailToken: string) => void;
		jwt: {
			sign: (payload: SessionToken) => Promise<Token>;
			verify: (token: string) => Promise<SessionToken>;
		};
	}

	interface FastifyRequest {
		file: MultipartFile;
		user?: typeof User.$inferSelect;
	}
}

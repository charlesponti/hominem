import sendgrid, { type MailDataRequired } from "@sendgrid/mail";
import type { FastifyInstance } from "fastify";

import logger from "../logger";

const {
	SENDGRID_API_KEY,
	SENDGRID_SENDER_EMAIL,
	SENDGRID_SENDER_NAME,
	NODE_ENV,
} = process.env;

const isDev = NODE_ENV === "development";

export default async function emailPlugin(server: FastifyInstance) {
	if (!SENDGRID_API_KEY) {
		console.error(
			"warn",
			"The SENDGRID_API_KEY env var must be set, otherwise the API cannot send emails.",
		);
		process.exit(1);
	}

	// Set SendGrid API key
	sendgrid.setApiKey(SENDGRID_API_KEY);

	server.decorate(
		"sendEmail",
		async (email: string, subject: string, text: string, html: string) => {
			const msg: MailDataRequired = {
				to: email,
				from: {
					email: SENDGRID_SENDER_EMAIL as string,
					name: SENDGRID_SENDER_NAME,
				},
				subject,
				text,
				html,
			};

			// Only send an email in prod. Log token in development to not waste SendGrid email quota.
			if (isDev) {
				server.log.info(`Email sent to: ${email}: ${text} `);
			} else {
				try {
					await sendgrid.send(msg);
					server.log.info("Email sent", {
						receiver: email,
						sender: SENDGRID_SENDER_EMAIL,
					});
				} catch (err) {
					server.log.error(
						{ err, email, subject, text, html },
						"Error sending email",
					);
					throw new Error("Error sending email");
				}
			}
		},
	);
}

export async function sendEmailToken(email: string, token: string) {
	const msg: MailDataRequired = {
		to: email,
		from: {
			email: SENDGRID_SENDER_EMAIL as string,
			name: SENDGRID_SENDER_NAME,
		},
		subject: "Your Ponti Studios login token",
		text: `The login token for the API is: ${token}`,
		html: `
			<div style="font-family: sans-serif;">
				<div style="display: flex; align-items: center; margin-bottom: 16px; padding: 16px 0;">
					<h1>Ponti Studios</h1>
				</div>
				<p>The login token for the API is: ${token}</p>
			</div>
		`,
	};

	// Log the email token in development to not expend SendGrid email quota
	if (isDev) {
		logger.info(`Email token for ${email}: ${token} `);
		return;
	}

	try {
		await sendgrid.send(msg);
		logger.info(
			`sending email token to ${email} from ${SENDGRID_SENDER_EMAIL}`,
		);
	} catch (err) {
		logger.error({ err, email, token }, "Error sending email token");
		throw new Error("Error sending email");
	}
}

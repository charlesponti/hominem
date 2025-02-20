import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { db, takeUniqueOrThrow } from "@ponti/utils/db";
import { chat, chatMessage } from "@ponti/utils/schema";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import type { RequestWithSession } from "../../typings";
import { verifySession } from "../auth/utils";

const formatMessage = (message: { role: string; content: string }) => {
	return `${message.role}: ${message.content}`;
};

const TEMPLATE = `
	You are an expert assistant at what the topic the user begins the conversation with.

	## Rules
	- Only respond based on the conversation topic that was set based on the user's first message.
	- Do not introduce new topics.
	- Do not provide any information that is not directly related to the user's first message.
	- Do not ask questions.
	- If the user asks a question, provide a direct answer.
	- If the user makes a statement, provide a response that is relevant to the user's statement.
	- If the user makes a statement that is not related to the conversation topic, inform the user what the conversation topic is.

	## Current conversation:
	{chat_history}

	## User input
	{input}
`;

const STRUCTURED_OUTPUT_TEMPLATE = `
Extract the requested fields from the input.

The field "entity" refers to the first mentioned entity in the input.

## Input:
{input}
`;

const chatPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.post(
		"/chat",
		{
			preValidation: verifySession,
		},
		async (request: RequestWithSession, reply) => {
			const { userId } = request.session.get("data");

			if (!userId) {
				return reply.code(401).send({ error: "Unauthorized" });
			}

			try {
				let activeChat = null;
				const activeChatId = request.cookies.activeChat;

				if (activeChatId) {
					activeChat = await db
						.select()
						.from(chat)
						.where(eq(chat.id, activeChatId))
						.limit(1)
						.then(takeUniqueOrThrow);
				} else {
					activeChat = await db
						.insert(chat)
						.values({
							id: crypto.randomUUID(),
							title: "Basic Chat",
							userId,
						})
						.returning()
						.then(takeUniqueOrThrow);
					reply.setCookie("activeChat", activeChat.id);
				}

				if (!chat) {
					return reply.code(404).send({ error: "Chat not found" });
				}

				const messages = await db
					.select()
					.from(chatMessage)
					.where(eq(chatMessage.chatId, chat.id));

				const { message } = request.body as { message: string };

				const formattedPreviousMessages = messages
					.slice(0, -1)
					.map(formatMessage);
				const prompt = PromptTemplate.fromTemplate(TEMPLATE);
				const model = new ChatOpenAI({
					streaming: false,
				});

				const result = await prompt
					.pipe(model)
					.pipe(new HttpResponseOutputParser())
					.invoke({
						chat_history: formattedPreviousMessages.join("\n"),
						input: message,
					});

				const formattedBufferResult = Buffer.from(result).toString("utf-8");

				const newMessages = await db.transaction(async (t) => {
					if (!userId) {
						return [];
					}

					return [
						// Insert user message
						await t
							.insert(chatMessage)
							.values({
								id: crypto.randomUUID(),
								userId,
								chatId: activeChat.id,
								role: "user",
								content: message,
							})
							.returning()
							.then(takeUniqueOrThrow),
						// Insert assistant message
						await t
							.insert(chatMessage)
							.values({
								id: crypto.randomUUID(),
								userId,
								chatId: activeChat.id,
								role: "assistant",
								content: formattedBufferResult,
							})
							.returning()
							.then(takeUniqueOrThrow),
					];
				});

				return reply.send({
					messages: messages.concat(newMessages),
				});
			} catch (e) {
				fastify.log.error(e);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);
};

export default fp(chatPlugin, {
	name: "chatPlugin",
	dependencies: ["@fastify/cookie", "@fastify/session"],
});

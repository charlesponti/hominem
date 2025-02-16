import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { chatMessage } from "@ponti/utils/schema";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { db } from "../../../db";
import { verifySession } from "../../auth/utils";

const STRUCTURED_OUTPUT_TEMPLATE =
	"Extract the requested fields from the input.";

export const structuredOutputPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.post(
		"/structuredOutput",
		{
			preHandler: verifySession,
			schema: {
				body: {
					type: "object",
					required: ["chatId", "message"],
					properties: {
						chatId: { type: "string" },
						message: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const { chatId, message } = request.body as {
				chatId: string;
				message: string;
			};

			const messages = await db
				.select()
				.from(chatMessage)
				.where(eq(chatMessage.chatId, chatId));

			const prompt = PromptTemplate.fromTemplate(STRUCTURED_OUTPUT_TEMPLATE);

			const model = new ChatOpenAI({
				temperature: 0.8,
				model: "gpt-4o-mini",
			});

			const schema = z.object({
				tone: z
					.enum(["positive", "negative", "neutral"])
					.describe("The overall tone of the input"),
				entity: z.string().describe("The entity mentioned in the input"),
				word_count: z.number().describe("The number of words in the input"),
				chat_response: z.string().describe("A response to the human's input"),
				final_punctuation: z
					.optional(z.string())
					.describe("The final punctuation mark in the input, if any."),
			});

			const functionCallingModel = model.bind({
				functions: [
					{
						name: "output_formatter",
						description: "Should always be used to properly format output",
						parameters: zodToJsonSchema(schema),
					},
				],
				function_call: { name: "output_formatter" },
			});

			const chain = prompt
				.pipe(functionCallingModel)
				.pipe(new JsonOutputFunctionsParser());

			const result = await chain.invoke({
				input: [
					...messages.map((m: { content: string }) => m.content),
					message,
				].join("\n"),
			});

			return {
				chatId,
				result,
			};
		},
	);
};

export default fastifyPlugin(structuredOutputPlugin);

import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { AIMessage, ChatMessage, HumanMessage } from "@langchain/core/messages";
import {
	ChatPromptTemplate,
	MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import type { Message as VercelChatMessage } from "ai";
import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { createRetrieverTool } from "langchain/tools/retriever";
import { supabaseClient } from "../../../lib/supabase";
import { openaiEmbeddings } from "../../../lib/openai";

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
	if (message.role === "user") {
		return new HumanMessage(message.content);
	}

	if (message.role === "assistant") {
		return new AIMessage(message.content);
	}

	return new ChatMessage(message.content, message.role);
};

const AGENT_SYSTEM_TEMPLATE = `You are a stereotypical robot named Robbie and must answer all questions like a stereotypical robot. Use lots of interjections like "BEEP" and "BOOP".

If you don't know how to answer a question, use the available tools to look up relevant information. You should particularly do this for questions about LangChain.
`;

const retrievalAgentPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.post("/retrieval-agent", async (request, reply) => {
		try {
			const body = request.body as {
				messages: VercelChatMessage[];
				show_intermediate_steps: boolean;
			};
			/**
			 * We represent intermediate steps as system messages for display purposes,
			 * but don't want them in the chat history.
			 */
			const messages = (body.messages ?? []).filter(
				(message: VercelChatMessage) =>
					message.role === "user" || message.role === "assistant",
			);
			const returnIntermediateSteps = body.show_intermediate_steps;
			const previousMessages = messages
				.slice(0, -1)
				.map(convertVercelMessageToLangChainMessage);
			const currentMessageContent = messages[messages.length - 1].content;

			const chatModel = new ChatOpenAI({
				model: "gpt-4o-mini",
				temperature: 0.2,
				// IMPORTANT: Must "streaming: true" on OpenAI to enable final output streaming below.
				streaming: true,
			});

			const vectorstore = new SupabaseVectorStore(openaiEmbeddings, {
				client: supabaseClient,
				tableName: "documents",
				queryName: "match_documents",
			});

			const retriever = vectorstore.asRetriever();

			/**
			 * Wrap the retriever in a tool to present it to the agent in a
			 * usable form.
			 */
			const tool = createRetrieverTool(retriever, {
				name: "search_latest_knowledge",
				description: "Searches and returns up-to-date general information.",
			});

			/**
			 * Based on https://smith.langchain.com/hub/hwchase17/openai-functions-agent
			 *
			 * This default prompt for the OpenAI functions agent has a placeholder
			 * where chat messages get inserted as "chat_history".
			 *
			 * You can customize this prompt yourself!
			 */
			const prompt = ChatPromptTemplate.fromMessages([
				["system", AGENT_SYSTEM_TEMPLATE],
				new MessagesPlaceholder("chat_history"),
				["human", "{input}"],
				new MessagesPlaceholder("agent_scratchpad"),
			]);

			const agent = await createToolCallingAgent({
				llm: chatModel,
				tools: [tool],
				prompt,
			});

			const agentExecutor = new AgentExecutor({
				agent,
				tools: [tool],
				// Set this if you want to receive all intermediate steps in the output of .invoke().
				returnIntermediateSteps,
			});

			if (!returnIntermediateSteps) {
				/**
				 * Agent executors also allow you to stream back all generated tokens and steps
				 * from their runs.
				 *
				 * This contains a lot of data, so we do some filtering of the generated log chunks
				 * and only stream back the final response.
				 *
				 * This filtering is easiest with the OpenAI functions or tools agents, since final outputs
				 * are log chunk values from the model that contain a string instead of a function call object.
				 *
				 * See: https://js.langchain.com/docs/modules/agents/how_to/streaming#streaming-tokens
				 */
				const logStream = await agentExecutor.invoke({
					input: currentMessageContent,
					chat_history: previousMessages,
				});

				return reply.status(200).send(logStream);
			}

			/**
			 * Intermediate steps are the default outputs with the executor's `.stream()` method.
			 * We could also pick them out from `streamLog` chunks.
			 * They are generated as JSON objects, so streaming them is a bit more complicated.
			 */
			const result = await agentExecutor.invoke({
				input: currentMessageContent,
				chat_history: previousMessages,
			});

			return reply.status(200).send({
				output: result.output,
				intermediate_steps: result.intermediateSteps,
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(e);
			return reply
				.status(500)
				.send({ error: "Error retrieving information from the database" });
		}
	});
};

export default fastifyPlugin(retrievalAgentPlugin);

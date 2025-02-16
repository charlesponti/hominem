import { Calculator } from "@langchain/community/tools/calculator";
import { SerpAPI } from "@langchain/community/tools/serpapi";
import { AIMessage, ChatMessage, HumanMessage } from "@langchain/core/messages";
import {
	ChatPromptTemplate,
	MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { Message as VercelChatMessage } from "ai";
import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
	if (message.role === "user") {
		return new HumanMessage(message.content);
	}
	if (message.role === "assistant") {
		return new AIMessage(message.content);
	}

	return new ChatMessage(message.content, message.role);
};

const AGENT_SYSTEM_TEMPLATE =
	"You are a talking parrot named Polly. All final responses must be how a talking parrot would respond. Squawk often!";

const agentPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.post("/agent", async (request, reply) => {
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

			const previousMessages = messages
				.slice(0, -1)
				.map(convertVercelMessageToLangChainMessage);
			const currentMessageContent = messages[messages.length - 1].content;

			// Requires process.env.SERPAPI_API_KEY to be set: https://serpapi.com/
			// You can remove this or use a different tool instead.
			const tools = [new Calculator(), new SerpAPI()];
			const toolNode = new ToolNode(tools);
			const llm = new ChatOpenAI({
				model: "gpt-4o-mini",
				temperature: 0,
				streaming: true,
			}).bindTools(tools);

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

			/**
			 * Intermediate steps are the default outputs with the executor's `.stream()` method.
			 * We could also pick them out from `streamLog` chunks.
			 * They are generated as JSON objects, so streaming them is a bit more complicated.
			 */
			const result = await toolNode.invoke({
				messages: [
					await llm.invoke(
						messages.map(convertVercelMessageToLangChainMessage),
					),
				],
			});

			return reply.status(200).send({
				output: result.output,
				intermediate_steps: result.intermediateSteps,
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(e);
			return reply.send({
				error: "Internal Server Error",
				status: 500,
			});
		}
	});
};

export default fastifyPlugin(agentPlugin, {
	name: "agentPlugin",
	dependencies: ["@fastify/cookie", "@fastify/session"],
});

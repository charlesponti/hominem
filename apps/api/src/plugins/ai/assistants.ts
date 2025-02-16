import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { openaiClient } from "../../lib/openai";

// Mock implementations of task functions
const create_tasks = (tasks: string[]) => ({
	message: `Created tasks: ${tasks.join(", ")}`,
});
const edit_tasks = (taskId: string, updates: object) => ({
	message: `Edited task ${taskId} with updates: ${JSON.stringify(updates)}`,
});
const search_tasks = (query: string) => ({
	message: `Searched for tasks with query: ${query}`,
});
const chat = (message: string) => ({ message: `Chat response: ${message}` });

// Single function that encapsulates all other functions
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const execute_actions = (actions: any[]) => {
	return actions.map(({ action, params }) => {
		switch (action) {
			case "create_tasks":
				return create_tasks(params.tasks);
			case "edit_tasks":
				return edit_tasks(params.taskId, params.updates);
			case "search_tasks":
				return search_tasks(params.query);
			case "chat":
				return chat(params.message);
			default:
				throw new Error(`Unknown action: ${action}`);
		}
	});
};

const function_definition = {
	name: "execute_actions",
	description: "Execute one or more actions based on user input",
	parameters: {
		type: "object",
		properties: {
			actions: {
				type: "array",
				items: {
					type: "object",
					properties: {
						action: {
							type: "string",
							enum: ["create_tasks", "edit_tasks", "search_tasks", "chat"],
							description: "The action to perform",
						},
						params: {
							type: "object",
							properties: {
								tasks: {
									type: "array",
									items: { type: "string" },
									description:
										"List of tasks to create (for create_tasks action)",
								},
								taskId: {
									type: "string",
									description: "ID of the task to edit (for edit_tasks action)",
								},
								updates: {
									type: "object",
									description:
										"Updates to apply to the task (for edit_tasks action)",
								},
								query: {
									type: "string",
									description: "Search query (for search_tasks action)",
								},
								message: {
									type: "string",
									description: "User message (for chat action)",
								},
							},
						},
					},
					required: ["action", "params"],
				},
			},
		},
		required: ["actions"],
	},
};

const assistantPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.post("/assistant", async (request, reply) => {
		const { input } = request.body as { input: string };

		try {
			const completion = await openaiClient.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: input }],
				functions: [function_definition],
				function_call: { name: "execute_actions" },
			});

			const responseMessage = completion.choices[0].message;

			if (responseMessage.tool_calls) {
				const { actions } = JSON.parse(
					responseMessage.tool_calls[0].function.arguments,
				) as {
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					actions: any[];
				};

				const results = execute_actions(actions);

				// Get a suitable response for the user based on the function results
				const finalResponse = await openaiClient.chat.completions.create({
					model: "gpt-4o-mini",
					messages: [
						{ role: "user", content: input },
						responseMessage,
						{
							role: "function",
							name: "execute_actions",
							content: JSON.stringify({ results }),
						},
					],
				});

				return finalResponse.choices[0].message.content;
			}

			// If no function was called, return the assistant's response directly
			return responseMessage.content;
		} catch (error) {
			console.error("Error:", error);
			reply
				.code(500)
				.send({ error: "An error occurred while processing your request." });
		}
	});
};

export default fp(assistantPlugin);

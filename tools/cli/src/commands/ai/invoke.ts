import { Args, Command, Flags } from '@oclif/core';
import { z } from 'zod';

import { requestJson } from '../../http';
import { parseJsonPayload } from '../../http';
import { validateWithZod } from '../../utils/zod-validation';

const createChatSchema = z.object({
  id: z.string(),
});

const sendMessageSchema = z.object({
  messages: z
    .object({
      assistant: z
        .object({
          content: z.string().optional(),
          toolCalls: z
            .array(
              z.object({
                toolName: z.string(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

const outputSchema = z.object({
  baseUrl: z.string(),
  chatId: z.string(),
  assistant: z.object({
    content: z.string().nullable(),
    toolCalls: z.array(
      z.object({
        toolName: z.string(),
      }),
    ),
  }),
});

type InvokeOutput = z.infer<typeof outputSchema>;

export default class AiInvoke extends Command {
  static override description = 'Creates a chat and sends a single prompt message.';

  static override examples = ['<%= config.bin %> <%= command.id %> "What is 2+2?"'];

  static override args = {
    message: Args.string({
      description: 'Message to send to the AI',
      required: true,
    }),
  };

  static override flags = {
    baseUrl: Flags.string({
      description: 'Base URL of the agent service',
      default: 'http://localhost:4040',
    }),
    showToolCalls: Flags.boolean({
      description: 'Show tool calls in output',
      default: false,
    }),
  };

  static override enableJsonFlag = true;

  async run(): Promise<InvokeOutput> {
    const { args, flags } = await this.parse(AiInvoke);

    try {
      const createdRaw = await requestJson({
        method: 'POST',
        baseUrl: flags.baseUrl,
        path: '/api/chats',
        body: JSON.stringify({ title: 'CLI' }),
        abortSignal: undefined,
      });
      const createdParsed = parseJsonPayload(createdRaw, '/api/chats');
      const createdResult = createChatSchema.safeParse(createdParsed);
      if (!createdResult.success) {
        this.error('Chat creation response schema was invalid', {
          exit: 3,
          code: 'DEPENDENCY_RESPONSE_INVALID',
        });
      }
      const created = createdResult.data;

      const sentRaw = await requestJson({
        method: 'POST',
        baseUrl: flags.baseUrl,
        path: `/api/chats/${created.id}/send`,
        body: JSON.stringify({ message: args.message }),
        abortSignal: undefined,
      });
      const sentParsed = parseJsonPayload(sentRaw, `/api/chats/${created.id}/send`);
      const sentResult = sendMessageSchema.safeParse(sentParsed);
      if (!sentResult.success) {
        this.error('Chat send response schema was invalid', {
          exit: 3,
          code: 'DEPENDENCY_RESPONSE_INVALID',
        });
      }
      const sent = sentResult.data;

      const toolCalls = sent.messages?.assistant?.toolCalls ?? [];
      const filteredToolCalls = flags.showToolCalls ? toolCalls : [];

      const output: InvokeOutput = {
        baseUrl: flags.baseUrl,
        chatId: created.id,
        assistant: {
          content: sent.messages?.assistant?.content ?? null,
          toolCalls: filteredToolCalls.map((toolCall) => ({
            toolName: toolCall.toolName,
          })),
        },
      };

      validateWithZod(outputSchema, output);
      return output;
    } catch (error) {
      if (error instanceof Error && !('exit' in error)) {
        this.error(`Failed to invoke AI: ${error.message}`, {
          exit: 5,
          code: 'INTERNAL_ERROR',
        });
      }
      throw error;
    }
  }
}

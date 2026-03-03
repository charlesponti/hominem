import { z } from 'zod';

import { createCommand } from '../../command-factory';
import { CliError } from '../../errors';
import { requestJson } from '../../http';
import { parseJsonPayload } from '../../http';

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

export default createCommand({
  name: 'ai invoke',
  summary: 'Invoke AI message flow',
  description: 'Creates a chat and sends a single prompt message.',
  argNames: ['message'],
  args: z.object({
    message: z.string().min(1),
  }),
  flags: z.object({
    baseUrl: z.string().default('http://localhost:4040'),
    showToolCalls: z.boolean().default(false),
  }),
  outputSchema: z.object({
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
  }),
  async run({ args, flags, context }) {
    const createdRaw = await requestJson({
      method: 'POST',
      baseUrl: flags.baseUrl,
      path: '/api/chats',
      body: JSON.stringify({ title: 'CLI' }),
      abortSignal: context.abortSignal,
    });
    const createdParsed = parseJsonPayload(createdRaw, '/api/chats');
    const createdResult = createChatSchema.safeParse(createdParsed);
    if (!createdResult.success) {
      throw new CliError({
        code: 'DEPENDENCY_RESPONSE_INVALID',
        category: 'dependency',
        message: 'Chat creation response schema was invalid',
      });
    }
    const created = createdResult.data;

    const sentRaw = await requestJson({
      method: 'POST',
      baseUrl: flags.baseUrl,
      path: `/api/chats/${created.id}/send`,
      body: JSON.stringify({ message: args.message }),
      abortSignal: context.abortSignal,
    });
    const sentParsed = parseJsonPayload(sentRaw, `/api/chats/${created.id}/send`);
    const sentResult = sendMessageSchema.safeParse(sentParsed);
    if (!sentResult.success) {
      throw new CliError({
        code: 'DEPENDENCY_RESPONSE_INVALID',
        category: 'dependency',
        message: 'Chat send response schema was invalid',
      });
    }
    const sent = sentResult.data;

    const toolCalls = sent.messages?.assistant?.toolCalls ?? [];
    const filteredToolCalls = flags.showToolCalls ? toolCalls : [];

    return {
      baseUrl: flags.baseUrl,
      chatId: created.id,
      assistant: {
        content: sent.messages?.assistant?.content ?? null,
        toolCalls: filteredToolCalls.map((toolCall) => ({
          toolName: toolCall.toolName,
        })),
      },
    };
  },
});

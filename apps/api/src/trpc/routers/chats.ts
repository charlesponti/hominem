import { openai } from "@ai-sdk/openai";
import { ChatService, MessageService } from "@hominem/data/chat";
import { allTools } from "@hominem/data/tools";
import { TRPCError } from "@trpc/server";
import type { Tool, ToolExecutionOptions, ToolSet } from "ai";
import { streamText } from "ai";
import { z } from "zod";
import { protectedProcedure, router } from "../procedures";

const chatService = new ChatService();
const messageService = new MessageService();

const withUserContextTools = (tools: ToolSet, userId: string): ToolSet =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => {
      if (!tool || typeof tool.execute !== "function") {
        return [name, tool];
      }

      const wrappedTool: Tool = {
        ...tool,
        execute: async (
          args: Record<string, unknown>,
          options: ToolExecutionOptions
        ) => tool.execute!({ ...args, userId }, options),
      };

      return [name, wrappedTool];
    })
  );

// Helper function to ensure user is authorized and chat exists
const ensureChatAndUser = async (
  userId: string | undefined,
  chatId: string | undefined
) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const currentChat = await chatService.getOrCreateActiveChat(userId, chatId);

  if (!currentChat) {
    throw new Error("Failed to get or create chat");
  }

  return currentChat;
};

// Helper function to handle streaming errors
const handleStreamError = (error: unknown, defaultMessage: string): never => {
  console.error(defaultMessage, error);
  if (error instanceof TRPCError) {
    throw error;
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: defaultMessage,
    cause: error,
  });
};

// Helper function for consistent error handling across endpoints
const handleEndpointError = (
  error: unknown,
  defaultMessage: string,
  operation: string
): never => {
  console.error(`Failed to ${operation}:`, error);
  if (error instanceof TRPCError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message || defaultMessage,
      cause: error,
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: defaultMessage,
    cause: error,
  });
};

export const chatsRouter = router({
  getUserChats: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      if (!userId) {
        throw new Error("Unauthorized");
      }

      const chats = await chatService.getUserChats(userId, input.limit);
      return chats;
    }),

  getChatById: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { chatId } = input;
      const { userId } = ctx;
      if (!chatId) {
        throw new Error("Chat ID is required");
      }

      try {
        const [chat, messages] = await Promise.all([
          chatService.getChatById(chatId, userId),
          messageService.getChatMessages(chatId, { limit: 10 }),
        ]);

        if (!chat) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Chat not found",
          });
        }

        return { ...chat, messages };
      } catch (error) {
        return handleEndpointError(error, "Failed to load chat", "get chat");
      }
    }),

  createChat: protectedProcedure
    .input(
      z.object({
        title: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { title } = input;
      const { userId } = ctx;

      if (!title) {
        throw new Error("Title is required");
      }

      if (!userId) {
        throw new Error("Unauthorized");
      }

      try {
        const chat = await chatService.createChat({ title, userId });
        return { chat };
      } catch (error) {
        return handleEndpointError(
          error,
          "Failed to create chat",
          "create chat"
        );
      }
    }),

  deleteChat: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId } = input;
      const { userId } = ctx;

      if (!chatId) {
        throw new Error("Chat ID is required");
      }

      if (!userId) {
        throw new Error("Unauthorized");
      }

      try {
        const success = await chatService.deleteChat(chatId, userId);
        return { success };
      } catch (error) {
        return handleEndpointError(
          error,
          "Failed to delete chat",
          "delete chat"
        );
      }
    }),

  updateChatTitle: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        title: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId, title } = input;
      const { userId } = ctx;

      if (!chatId || !title) {
        throw new Error("Chat ID and title are required");
      }

      if (!userId) {
        throw new Error("Unauthorized");
      }

      try {
        const chat = await chatService.updateChatTitle(chatId, title, userId);
        return { success: !!chat };
      } catch (error) {
        return handleEndpointError(
          error,
          "Failed to update chat title",
          "update chat title"
        );
      }
    }),

  searchChats: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        query: z.string(),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const { query, limit } = input;
      const { userId } = ctx;

      if (!userId) {
        throw new Error("Unauthorized");
      }

      if (!query) {
        throw new Error("Query is required");
      }

      try {
        const chats = await chatService.searchChats({ userId, query, limit });
        return { chats };
      } catch (error) {
        return handleEndpointError(
          error,
          "Failed to search chats",
          "search chats"
        );
      }
    }),

  generate: protectedProcedure
    .input(
      z.object({
        message: z
          .string()
          .min(1, "Message cannot be empty")
          .max(10000, "Message is too long (max 10000 characters)"),
        chatId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;
      const { message, chatId } = input;

      try {
        const currentChat = await ensureChatAndUser(userId, chatId);
        const startTime = Date.now();

        const userContextTools = withUserContextTools(allTools, userId);

        // Load conversation history for context (last 20 messages)
        const historyMessages = await messageService.getChatMessages(
          currentChat.id,
          { limit: 20, orderBy: "asc" }
        );
        const aiContextMessages = MessageService.toAIContext(historyMessages);

        // Save the user message first
        const userMessage = await messageService.addMessage({
          chatId: currentChat.id,
          userId,
          role: "user",
          content: message,
        });

        // Add the new user message to context
        const messagesWithNewUser = [
          ...aiContextMessages,
          {
            role: "user" as const,
            content: message,
          },
        ];

        // Create a streaming response with full conversation context
        const stream = await streamText({
          model: openai("gpt-4.1"),
          tools: userContextTools,
          messages: messagesWithNewUser,
        });

        // Create a placeholder for the assistant message
        const assistantMessage = await messageService.addMessage({
          chatId: currentChat.id,
          userId: "", // Assistant messages don't have a userId
          role: "assistant",
          content: "", // Will be updated as we stream
        });

        // Consume the stream server-side and update the message incrementally
        // This runs in the background after the response is returned
        let accumulatedContent = "";
        let lastUpdateTime = Date.now();
        let lastUpdateLength = 0;
        const BATCH_UPDATE_INTERVAL = 500; // Update every 500ms
        const BATCH_UPDATE_CHARS = 50; // Or every 50 characters

        (async () => {
          const MAX_UPDATE_RETRIES = 3;
          let updateRetryCount = 0;

          try {
            for await (const chunk of stream.textStream) {
              accumulatedContent += chunk;
              const timeSinceLastUpdate = Date.now() - lastUpdateTime;
              const charsSinceLastUpdate =
                accumulatedContent.length - lastUpdateLength;

              // Batch updates: update every 500ms OR every 50 characters
              if (
                timeSinceLastUpdate >= BATCH_UPDATE_INTERVAL ||
                charsSinceLastUpdate >= BATCH_UPDATE_CHARS
              ) {
                let updateSuccess = false;
                updateRetryCount = 0;

                // Retry logic for database updates
                while (
                  !updateSuccess &&
                  updateRetryCount < MAX_UPDATE_RETRIES
                ) {
                  try {
                    await messageService.updateMessage(
                      assistantMessage.id,
                      accumulatedContent
                    );
                    lastUpdateTime = Date.now();
                    lastUpdateLength = accumulatedContent.length;
                    updateSuccess = true;
                    updateRetryCount = 0; // Reset on success
                  } catch (updateError) {
                    updateRetryCount++;
                    console.error(
                      `Error updating message during stream (retry ${updateRetryCount}/${MAX_UPDATE_RETRIES}):`,
                      updateError
                    );
                    if (updateRetryCount < MAX_UPDATE_RETRIES) {
                      // Exponential backoff before retry
                      await new Promise((resolve) =>
                        setTimeout(resolve, 1000 * updateRetryCount)
                      );
                    } else {
                      // Max retries exceeded, log but continue streaming
                      console.error(
                        "Max retries exceeded for message update, continuing stream"
                      );
                    }
                  }
                }
              }
            }

            // Final update with any remaining content and tool calls
            const result = await stream;
            const resultText = await result.text;
            const finalContent = resultText || accumulatedContent;

            // Get tool calls from the result and convert to message format
            // Note: toolCalls may be a Promise or direct array depending on AI SDK version
            const toolCallsRaw = result.toolCalls;
            const toolCallsArray =
              toolCallsRaw instanceof Promise
                ? await toolCallsRaw
                : Array.isArray(toolCallsRaw)
                ? toolCallsRaw
                : [];
            const formattedToolCalls =
              toolCallsArray.length > 0
                ? toolCallsArray.map(
                    (tc: {
                      toolName: string;
                      toolCallId: string;
                      args: Record<string, unknown>;
                    }) => ({
                      type: "tool-call" as const,
                      toolName: tc.toolName,
                      toolCallId: tc.toolCallId,
                      args: tc.args as Record<string, unknown>,
                    })
                  )
                : undefined;

            // Final update with content
            await messageService.updateMessage(
              assistantMessage.id,
              finalContent
            );

            // Update tool calls by re-adding message with tool calls
            // This is a workaround since updateMessage doesn't support toolCalls
            // TODO: Extend MessageService.updateMessage to support toolCalls
            if (formattedToolCalls && formattedToolCalls.length > 0) {
              // Get current message to preserve fields
              const currentMessages = await messageService.getChatMessages(
                currentChat.id,
                { limit: 100, orderBy: "desc" }
              );
              const currentMessage = currentMessages.find(
                (m) => m.id === assistantMessage.id
              );
              if (currentMessage) {
                // Delete and re-add with tool calls (temporary solution)
                // In production, extend updateMessage to handle toolCalls
                await messageService.deleteMessage(
                  assistantMessage.id,
                  userId || ""
                );
                await messageService.addMessage({
                  chatId: currentChat.id,
                  userId: "",
                  role: "assistant",
                  content: finalContent,
                  toolCalls: formattedToolCalls,
                });
              }
            }
          } catch (streamError) {
            console.error("Error consuming stream:", streamError);
            // Update message with error indicator if needed
            await messageService.updateMessage(
              assistantMessage.id,
              accumulatedContent || "[Error: Stream processing failed]"
            );
          }
        })();

        // Return the initial response immediately
        return {
          // Streaming context
          streamId: assistantMessage.id,
          chatId: currentChat.id,
          chatTitle: currentChat.title,

          // Saved messages
          messages: {
            user: userMessage,
            assistant: assistantMessage,
          },

          // Metadata
          metadata: {
            model: "gpt-4.1",
            startTime: startTime,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        return handleStreamError(
          error,
          "Failed to generate streaming response"
        );
      }
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;
      const { chatId, limit, offset } = input;

      if (!userId) {
        throw new Error("Unauthorized");
      }

      const messages = await messageService.getChatMessages(chatId, {
        limit,
        offset,
      });
      return messages;
    }),
});

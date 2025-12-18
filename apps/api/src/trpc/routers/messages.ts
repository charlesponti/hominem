import { MessageService } from "@hominem/data/chat";
import { z } from "zod";
import { protectedProcedure, router } from "../procedures.js";

export const messagesRouter = router({
  getMessageById: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { messageId } = input;
      const { user } = ctx;

      const messageService = new MessageService();

      try {
        const message = await messageService.getMessageById(messageId, user.id);
        return { message };
      } catch (error) {
        console.error("Failed to get message:", error);
        throw new Error("Failed to load message");
      }
    }),

  // Delete message
  deleteMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { messageId } = input;
      const { user } = ctx;

      if (!messageId) {
        throw new Error("Message ID is required");
      }

      const messageService = new MessageService();

      try {
        const success = await messageService.deleteMessage(messageId, user.id);
        return { success };
      } catch (error) {
        console.error("Failed to delete message:", error);
        throw new Error("Failed to delete message");
      }
    }),
});

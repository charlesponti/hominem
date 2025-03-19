ALTER TABLE "chat_message" ADD COLUMN "toolCalls" json;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "toolResults" json;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "parentMessageId" uuid;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "messageIndex" text;
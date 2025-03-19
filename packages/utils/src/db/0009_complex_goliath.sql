ALTER TABLE "chat_message" ADD COLUMN "reasoning" json;--> statement-breakpoint
ALTER TABLE "chat_message" DROP COLUMN "toolResults";
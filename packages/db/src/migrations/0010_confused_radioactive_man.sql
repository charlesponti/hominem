ALTER TABLE "chat_message" ALTER COLUMN "reasoning" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "files" json;
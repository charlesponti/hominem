CREATE INDEX "list_invite_email_idx" ON "list_invite" USING btree ("invitedUserEmail");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "user_lists_user_id_idx" ON "user_lists" USING btree ("userId");
CREATE INDEX "item_itemId_itemType_idx" ON "item" USING btree ("itemId","itemType");--> statement-breakpoint
CREATE INDEX "item_listId_idx" ON "item" USING btree ("listId");--> statement-breakpoint
CREATE INDEX "item_listId_itemType_idx" ON "item" USING btree ("listId","itemType");--> statement-breakpoint
CREATE INDEX "place_location_gist_idx" ON "place" USING gist ("location");--> statement-breakpoint
CREATE INDEX "place_itemId_idx" ON "place" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "place_updatedAt_idx" ON "place" USING btree ("updatedAt");
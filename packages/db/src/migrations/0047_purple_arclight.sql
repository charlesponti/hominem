ALTER TABLE "events_users" DROP CONSTRAINT "events_users_person_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "events_users" ADD CONSTRAINT "events_users_person_id_contacts_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
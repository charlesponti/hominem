DROP INDEX "notes_search_idx";--> statement-breakpoint
CREATE INDEX "notes_search_idx" ON "notes" USING gin ((
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', "content"), 'B') ||
        setweight(to_tsvector('english', coalesce("tags"::text, '')), 'C')
      ));--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "search_vector";
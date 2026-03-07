CREATE TABLE "note_tags" (
	"note_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "note_tags_pkey" PRIMARY KEY("note_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "note_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_tags_note_idx" ON "note_tags" USING btree ("note_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "note_tags_tag_idx" ON "note_tags" USING btree ("tag_id" uuid_ops);--> statement-breakpoint
WITH extracted_note_tags AS (
	SELECT
		n.id AS note_id,
		n.user_id,
		CASE
			WHEN jsonb_typeof(tag_item) = 'object' THEN COALESCE(tag_item->>'value', tag_item->>'name')
			WHEN jsonb_typeof(tag_item) = 'string' THEN trim(both '"' FROM tag_item::text)
			ELSE NULL
		END AS tag_name
	FROM notes n
	CROSS JOIN LATERAL jsonb_array_elements(COALESCE(n.tags, '[]'::jsonb)) AS tag_item
),
normalized_note_tags AS (
	SELECT DISTINCT
		note_id,
		user_id,
		btrim(tag_name) AS tag_name
	FROM extracted_note_tags
	WHERE tag_name IS NOT NULL
		AND btrim(tag_name) <> ''
)
INSERT INTO tags (owner_id, name)
SELECT DISTINCT user_id, tag_name
FROM normalized_note_tags
ON CONFLICT (owner_id, name) DO NOTHING;--> statement-breakpoint
WITH extracted_note_tags AS (
	SELECT
		n.id AS note_id,
		n.user_id,
		CASE
			WHEN jsonb_typeof(tag_item) = 'object' THEN COALESCE(tag_item->>'value', tag_item->>'name')
			WHEN jsonb_typeof(tag_item) = 'string' THEN trim(both '"' FROM tag_item::text)
			ELSE NULL
		END AS tag_name
	FROM notes n
	CROSS JOIN LATERAL jsonb_array_elements(COALESCE(n.tags, '[]'::jsonb)) AS tag_item
),
normalized_note_tags AS (
	SELECT DISTINCT
		note_id,
		user_id,
		btrim(tag_name) AS tag_name
	FROM extracted_note_tags
	WHERE tag_name IS NOT NULL
		AND btrim(tag_name) <> ''
)
INSERT INTO note_tags (note_id, tag_id)
SELECT nnt.note_id, t.id
FROM normalized_note_tags nnt
JOIN tags t
	ON t.owner_id = nnt.user_id
	AND t.name = nnt.tag_name
ON CONFLICT (note_id, tag_id) DO NOTHING;--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "tags";--> statement-breakpoint
CREATE POLICY "note_tags_tenant_policy" ON "note_tags" AS PERMISSIVE FOR ALL TO public USING ((app_is_service_role() OR (EXISTS ( SELECT 1
   FROM notes n
  WHERE ((n.id = note_tags.note_id) AND (n.user_id = app_current_user_id())))))) WITH CHECK ((app_is_service_role() OR (EXISTS ( SELECT 1
   FROM notes n
  WHERE ((n.id = note_tags.note_id) AND (n.user_id = app_current_user_id()))))));

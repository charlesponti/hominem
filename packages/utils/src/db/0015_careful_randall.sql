CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"domain" text DEFAULT 'general' NOT NULL,
	"icon" text,
	"color" text,
	"parent_id" uuid,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "possessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"date_acquired" timestamp NOT NULL,
	"date_sold" timestamp,
	"brand_id" uuid,
	"category_id" uuid NOT NULL,
	"purchase_price" double precision NOT NULL,
	"sale_price" double precision,
	"url" text,
	"color" text,
	"image_url" text,
	"model_name" text,
	"model_number" text,
	"serial_number" text,
	"notes" text,
	"size" text,
	"from_user_id" uuid,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_brand_id_companies_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_from_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE cascade;
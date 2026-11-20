CREATE SEQUENCE "public"."lead_import_position" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "do_not_contact" (
	"address_hash" "bytea" PRIMARY KEY NOT NULL,
	"reason" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_type" text,
	"fit_level" text,
	"language" text,
	"time_zone" text,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"website_domain" text,
	"instagram_handle" text,
	"import_position" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_status_check" CHECK ("lead"."status" in ('found', 'waiting for review', 'approved', 'rejected', 'to contact by hand', 'emailed', 'replied', 'opted out', 'bounced', 'sequence finished')),
	CONSTRAINT "lead_client_type_check" CHECK ("lead"."client_type" in ('Cafés and roasters', 'Bars and restaurants', 'Breweries', 'Indie clothing brands', 'Gyms', 'Yoga and pilates studios', 'Hotels and resorts', 'Schools', 'Run and sports clubs', 'Events and festivals', 'Tech startups', 'Music artists and bands', 'Associations', 'Other')),
	CONSTRAINT "lead_fit_level_check" CHECK ("lead"."fit_level" in ('good', 'possible', 'poor')),
	CONSTRAINT "lead_language_check" CHECK ("lead"."language" in ('en', 'fr'))
);
--> statement-breakpoint
CREATE TABLE "lead_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"address" text NOT NULL,
	"address_normalised" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_fact" (
	"lead_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"source" text NOT NULL,
	"found_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_fact_lead_id_kind_source_pk" PRIMARY KEY("lead_id","kind","source")
);
--> statement-breakpoint
CREATE TABLE "lead_source" (
	"lead_id" uuid NOT NULL,
	"source" text NOT NULL,
	"sheet_sync_id" uuid,
	"sheet_row" integer,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_source_lead_id_source_pk" PRIMARY KEY("lead_id","source")
);
--> statement-breakpoint
CREATE TABLE "seen_business" (
	"key_hash" "bytea" PRIMARY KEY NOT NULL,
	"last_decision" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheet_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_count" integer,
	"flagged_count" integer,
	"skipped_count" integer,
	"lines" jsonb,
	"failure" text,
	CONSTRAINT "sheet_sync_trigger_check" CHECK ("sheet_sync"."trigger" in ('now', 'daily')),
	CONSTRAINT "sheet_sync_status_check" CHECK ("sheet_sync"."status" in ('running', 'done', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "lead_email" ADD CONSTRAINT "lead_email_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_fact" ADD CONSTRAINT "lead_fact_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_source" ADD CONSTRAINT "lead_source_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_source" ADD CONSTRAINT "lead_source_sheet_sync_id_sheet_sync_id_fk" FOREIGN KEY ("sheet_sync_id") REFERENCES "public"."sheet_sync"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_website_domain_unique" ON "lead" USING btree ("website_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_instagram_handle_unique" ON "lead" USING btree ("instagram_handle");--> statement-breakpoint
CREATE INDEX "lead_import_position_index" ON "lead" USING btree ("import_position");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_email_address_normalised_unique" ON "lead_email" USING btree ("address_normalised");--> statement-breakpoint
CREATE INDEX "lead_email_lead_index" ON "lead_email" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sheet_sync_one_running" ON "sheet_sync" USING btree ("status") WHERE "sheet_sync"."status" = 'running';--> statement-breakpoint
CREATE INDEX "sheet_sync_started_at_index" ON "sheet_sync" USING btree ("started_at");
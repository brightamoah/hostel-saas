CREATE TYPE "public"."notification_type" AS ENUM('complaint_created', 'maintenance_created', 'visitor_created', 'visitor_approved', 'billing_created', 'payment_completed', 'allocation_created', 'admin_created', 'announcement_posted', 'generic');--> statement-breakpoint
CREATE TABLE "auth_handoff_token" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auth_handoff_token_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"token_hash" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" "notification_type" DEFAULT 'generic' NOT NULL,
	"title" varchar(180) NOT NULL,
	"message" text NOT NULL,
	"actor_user_id" integer,
	"actor_admin_id" integer,
	"company_id" integer,
	"hostel_id" integer,
	"link_name" varchar(120),
	"link_query" json,
	"meta" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_read" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_read_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notification_id" integer NOT NULL,
	"admin_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_handoff_token" ADD CONSTRAINT "auth_handoff_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_admin_id_admin_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_hostel_id_hostel_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_read" ADD CONSTRAINT "notification_read_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_read" ADD CONSTRAINT "notification_read_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_handoff_token_hash_unique" ON "auth_handoff_token" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_company_created_at_idx" ON "notification" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_read_admin_notification_unique" ON "notification_read" USING btree ("admin_id","notification_id");
CREATE TYPE "report_module" AS ENUM('billing', 'rooms', 'student', 'visitor', 'maintenanceRequest', 'complaint', 'user');--> statement-breakpoint
CREATE TABLE "report_template" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "report_template_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"hostel_id" integer,
	"title" text NOT NULL,
	"description" text,
	"module" "report_module" NOT NULL,
	"config" jsonb NOT NULL,
	"is_prebuilt" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_template" ADD CONSTRAINT "report_template_company_id_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_template" ADD CONSTRAINT "report_template_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_template" ADD CONSTRAINT "report_template_hostel_id_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostel"("id") ON DELETE CASCADE;
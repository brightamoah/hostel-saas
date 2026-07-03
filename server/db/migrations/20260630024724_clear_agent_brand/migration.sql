CREATE TYPE "reminder_type" AS ENUM('upcoming', 'overdue');--> statement-breakpoint
ALTER TYPE "payment_method" ADD VALUE 'other';--> statement-breakpoint
ALTER TYPE "report_module" ADD VALUE 'payment';--> statement-breakpoint
ALTER TYPE "report_module" ADD VALUE 'allocation';--> statement-breakpoint
CREATE TABLE "billing_reminders_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "billing_reminders_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"billing_id" integer NOT NULL,
	"reminder_type" "reminder_type" NOT NULL,
	"days_offset" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "notify_on_upcoming" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "upcoming_reminder_days" integer[] DEFAULT ARRAY[7,5,3,1,0]::integer[] NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_reminder_unique" ON "billing_reminders_log" ("billing_id","reminder_type","days_offset");--> statement-breakpoint
ALTER TABLE "billing_reminders_log" ADD CONSTRAINT "billing_reminders_log_billing_id_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billing"("id") ON DELETE CASCADE;
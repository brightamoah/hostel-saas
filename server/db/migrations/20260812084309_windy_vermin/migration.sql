CREATE TYPE "email_type" AS ENUM('transactional', 'support', 'notification', 'others');--> statement-breakpoint
CREATE TYPE "outbox_email_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "residency_reset_batch_status" AS ENUM('committed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "residency_reset_trigger_source" AS ENUM('manual', 'cron', 'checkout');--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"recipient_email" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"from_name" varchar(255) NOT NULL,
	"from_email" varchar(255) NOT NULL,
	"reply_to" varchar(255),
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"text" text,
	"email_type" "email_type" DEFAULT 'transactional'::"email_type" NOT NULL,
	"status" "outbox_email_status" DEFAULT 'pending'::"outbox_email_status" NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "residency_reset_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"hostel_id" integer NOT NULL,
	"trigger_source" "residency_reset_trigger_source" NOT NULL,
	"triggered_by" integer,
	"academic_year" varchar(20),
	"academic_period" "academic_period" DEFAULT 'first semester'::"academic_period" NOT NULL,
	"idempotency_key" varchar(100) NOT NULL UNIQUE,
	"status" "residency_reset_batch_status" DEFAULT 'committed'::"residency_reset_batch_status" NOT NULL,
	"reason" text,
	"rollback_deadline" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rolled_back_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "residency_reset_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"batch_id" uuid NOT NULL,
	"allocation_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"previous_allocation_status" "allocation_status" NOT NULL,
	"previous_room_occupancy" integer NOT NULL,
	"previous_room_status" "room_status" NOT NULL,
	"previous_allowed_gender" "room_gender" NOT NULL,
	"room_version_after_reset" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "residency_reset_batch" ADD CONSTRAINT "residency_reset_batch_hostel_id_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostel"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "residency_reset_batch" ADD CONSTRAINT "residency_reset_batch_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "residency_reset_log" ADD CONSTRAINT "residency_reset_log_batch_id_residency_reset_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "residency_reset_batch"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "residency_reset_log" ADD CONSTRAINT "residency_reset_log_allocation_id_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "allocation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "residency_reset_log" ADD CONSTRAINT "residency_reset_log_room_id_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "residency_reset_log" ADD CONSTRAINT "residency_reset_log_student_id_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE;
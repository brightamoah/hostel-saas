ALTER TABLE "announcement" DROP CONSTRAINT "announcement_target_hostel_id_hostel_id_fk";
--> statement-breakpoint
ALTER TABLE "announcement" DROP CONSTRAINT "announcement_target_room_id_room_id_fk";
--> statement-breakpoint
ALTER TABLE "announcement" DROP CONSTRAINT "announcement_target_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "billing" DROP CONSTRAINT "billing_allocation_id_allocation_id_fk";
--> statement-breakpoint
ALTER TABLE "billing" DROP CONSTRAINT "billing_hostel_id_hostel_id_fk";
--> statement-breakpoint
ALTER TABLE "complaint" DROP CONSTRAINT "complaint_hostel_id_hostel_id_fk";
--> statement-breakpoint
ALTER TABLE "visitor_logs" ALTER COLUMN "admin_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "hostel_id" integer;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_target_hostel_id_hostel_id_fk" FOREIGN KEY ("target_hostel_id") REFERENCES "public"."hostel"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_target_room_id_room_id_fk" FOREIGN KEY ("target_room_id") REFERENCES "public"."room"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_allocation_id_allocation_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_hostel_id_hostel_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint" ADD CONSTRAINT "complaint_hostel_id_hostel_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_hostel_id_hostel_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostel"("id") ON DELETE restrict ON UPDATE no action;
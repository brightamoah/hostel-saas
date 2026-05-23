ALTER TABLE "allocation" DROP CONSTRAINT "unique_active_allocation";--> statement-breakpoint
ALTER TABLE "hostel" ADD COLUMN "join_code" varchar(20);--> statement-breakpoint
CREATE INDEX "idx_allocation_student_status" ON "allocation" USING btree ("student_id","status");--> statement-breakpoint
ALTER TABLE "hostel" ADD CONSTRAINT "hostel_joinCode_unique" UNIQUE("join_code");
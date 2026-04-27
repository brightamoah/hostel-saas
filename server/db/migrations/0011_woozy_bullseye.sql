CREATE TYPE "public"."audit_actor_type" AS ENUM('student', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ALLOCATE', 'CANCEL_ALLOCATION', 'PAYMENT', 'APPROVE', 'DENY', 'CREATE', 'STATUS_CHANGE', 'PASSWORD_RESET', 'ROLE_CHANGE', 'PERMISSION_CHANGE', 'DATA_EXPORT', 'DATA_IMPORT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('announcement', 'announcement_reads', 'billing', 'payment', 'complaint', 'complaint_response', 'maintenance_request', 'maintenance_response', 'visitor', 'visitor_logs', 'room', 'hostel', 'allocation', 'company', 'company_member', 'auth', 'user', 'student', 'admin', 'notification', 'audit_log', 'other');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company_id" integer,
	"hostel_id" integer,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_user_id" integer,
	"actor_admin_id" integer,
	"action_type" "audit_action" NOT NULL,
	"action" varchar(120) NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" integer,
	"description" text,
	"before" jsonb,
	"after" jsonb,
	"diff" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_hostel_id_hostel_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostel"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_admin_id_admin_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_company_created_at_idx" ON "audit_log" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_lookup_idx" ON "audit_log" USING btree ("company_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("company_id","actor_type","actor_user_id","actor_admin_id");
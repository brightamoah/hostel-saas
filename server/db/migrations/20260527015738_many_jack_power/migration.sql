CREATE TYPE "paystack_account_type" AS ENUM('bank_account', 'mobile_money');--> statement-breakpoint
ALTER TYPE "audit_entity_type" ADD VALUE 'hostel_settings' BEFORE 'allocation';--> statement-breakpoint
ALTER TYPE "audit_entity_type" ADD VALUE 'company_settings' BEFORE 'auth';--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "paystack_account_type" "paystack_account_type";--> statement-breakpoint
ALTER TABLE "hostel_settings" ADD COLUMN "paystack_account_type" "paystack_account_type";--> statement-breakpoint
ALTER TABLE "hostel_settings" ADD COLUMN "paystack_settlement_bank" varchar(100);
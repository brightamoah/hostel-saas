ALTER TABLE "company_settings" ALTER COLUMN "paystack_percentage_charge" SET DATA TYPE integer USING "paystack_percentage_charge"::integer;--> statement-breakpoint
ALTER TABLE "company_settings" ALTER COLUMN "paystack_percentage_charge" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "company_settings" ALTER COLUMN "paystack_percentage_charge" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hostel_settings" ALTER COLUMN "paystack_percentage_charge" SET DATA TYPE integer USING "paystack_percentage_charge"::integer;--> statement-breakpoint
ALTER TABLE "hostel_settings" ALTER COLUMN "paystack_percentage_charge" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hostel_settings" ALTER COLUMN "paystack_percentage_charge" SET NOT NULL;
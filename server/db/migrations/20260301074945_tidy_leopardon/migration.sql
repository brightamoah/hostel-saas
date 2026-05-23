ALTER TABLE "admin" DROP CONSTRAINT "chk_hostel_for_regular_support";--> statement-breakpoint
ALTER TABLE "admin" ALTER COLUMN "company_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admin" ADD CONSTRAINT "chk_admin_scope" CHECK (
    (
      access_level = 'super'
      AND hostel_id IS NULL
      AND company_id IS NULL
    )
    OR
    (
      access_level IN ('regular', 'support')
      AND hostel_id IS NOT NULL
      AND company_id IS NOT NULL
    )
  );
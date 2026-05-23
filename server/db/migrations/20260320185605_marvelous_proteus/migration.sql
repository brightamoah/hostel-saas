ALTER TABLE "announcement" ALTER COLUMN "company_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "announcement_reads" ALTER COLUMN "company_id" DROP NOT NULL;
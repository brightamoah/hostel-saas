CREATE TYPE "hostel_gender" AS ENUM('male', 'female', 'mixed');

--> statement-breakpoint
CREATE TYPE "hostel_gender_policy" AS ENUM('per_room', 'hostel_wide');

--> statement-breakpoint
ALTER TABLE "hostel_settings"
ALTER COLUMN "gender_policy"
DROP DEFAULT;

--> statement-breakpoint
ALTER TABLE "hostel_settings"
ALTER COLUMN "gender_policy"
SET DATA TYPE "hostel_gender_policy" USING "gender_policy"::"hostel_gender_policy";

--> statement-breakpoint
ALTER TABLE "hostel_settings"
ALTER COLUMN "gender_policy"
SET DEFAULT 'per_room'::"hostel_gender_policy";

--> statement-breakpoint
ALTER TABLE "hostel_settings"
ALTER COLUMN "hostel_gender"
SET DATA TYPE "hostel_gender" USING "hostel_gender"::"hostel_gender";

UPDATE "hostel_settings"
SET "hostel_gender" = 'mixed'
WHERE "hostel_gender" IS NULL;--> statement-breakpoint

--> statement-breakpoint
ALTER TABLE "hostel_settings"
ALTER COLUMN "hostel_gender"
SET DEFAULT 'mixed'::"hostel_gender";

--> statement-breakpoint
ALTER TABLE "hostel_settings"
ALTER COLUMN "hostel_gender"
SET NOT NULL;
-- Fix empty rooms so they are marked as 'unassigned'
UPDATE "room"
SET
  "allowed_gender" = 'unassigned'
WHERE
  "current_occupancy" = 0;

-- Fix occupied rooms that are erroneously marked as 'unassigned'
UPDATE "room"
SET
  "allowed_gender" = 'mixed'
WHERE
  "current_occupancy" > 0
  AND "allowed_gender" = 'unassigned';

ALTER TABLE "room" ADD CONSTRAINT "chk_occupancy_gender_safety" CHECK (
  (
    "current_occupancy" = 0
    AND "allowed_gender" = 'unassigned'
  )
  OR (
    "current_occupancy" > 0
    AND "allowed_gender" != 'unassigned'
  )
  OR ("allowed_gender" = 'mixed')
);

--> statement-breakpoint
ALTER TABLE "allocation"
DROP CONSTRAINT "chk_dates",
ADD CONSTRAINT "chk_dates" CHECK (
  "end_date" IS NULL
  OR "end_date" >= "allocation_date"
);

--> statement-breakpoint
ALTER TABLE "room"
DROP CONSTRAINT "chk_capacity",
ADD CONSTRAINT "chk_capacity" CHECK ("capacity" > 0);

--> statement-breakpoint
ALTER TABLE "room"
DROP CONSTRAINT "chk_occupancy",
ADD CONSTRAINT "chk_occupancy" CHECK (
  "current_occupancy" >= 0
  AND "current_occupancy" <= "capacity"
);
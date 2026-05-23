ALTER TABLE "allocation"
ADD COLUMN "hostel_id" integer;

--> statement-breakpoint
UPDATE "allocation"
SET
    "hostel_id" = (
        SELECT
            "hostel_id"
        FROM
            "room"
        WHERE
            "room"."id" = "allocation"."room_id"
    );

ALTER TABLE "allocation"
ADD CONSTRAINT "allocation_hostel_id_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostel" ("id") ON DELETE CASCADE;
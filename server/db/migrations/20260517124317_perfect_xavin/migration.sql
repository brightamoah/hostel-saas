/* 1. Wrap room_gender Type creation */
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_gender') THEN
    CREATE TYPE "public"."room_gender" AS ENUM('male', 'female', 'mixed', 'unassigned');
  END IF;
END $$;

--> statement-breakpoint

/* 2. Drop old constraints safely */
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactionReference_unique') THEN
        ALTER TABLE "payment" DROP CONSTRAINT "payment_transactionReference_unique";
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hostel_joinCode_unique') THEN
        ALTER TABLE "hostel" DROP CONSTRAINT "hostel_joinCode_unique";
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_roomNumber_unique') THEN
        ALTER TABLE "room" DROP CONSTRAINT "room_roomNumber_unique";
    END IF;
END $$;

--> statement-breakpoint

/* 3. Alter room gender column with type check */
DO $$ BEGIN
    -- Check if the column is already using the new type to avoid redundant conversion errors
    IF (SELECT udt_name FROM information_schema.columns 
        WHERE table_name = 'room' AND column_name = 'allowed_gender') != 'room_gender' THEN
        
        ALTER TABLE "room" ALTER COLUMN "allowed_gender" DROP DEFAULT;
        ALTER TABLE "room" ALTER COLUMN "allowed_gender" SET DATA TYPE "room_gender" USING "allowed_gender"::text::"room_gender";
        ALTER TABLE "room" ALTER COLUMN "allowed_gender" SET DEFAULT 'unassigned'::"room_gender";
    END IF;
END $$;

--> statement-breakpoint

/* 4. Add new constraints safely */
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_transaction_reference_key') THEN
        ALTER TABLE "payment" ADD CONSTRAINT "payment_transaction_reference_key" UNIQUE("transaction_reference");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hostel_join_code_key') THEN
        ALTER TABLE "hostel" ADD CONSTRAINT "hostel_join_code_key" UNIQUE("join_code");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_room_number_key') THEN
        ALTER TABLE "room" ADD CONSTRAINT "room_room_number_key" UNIQUE("room_number");
    END IF;
END $$;
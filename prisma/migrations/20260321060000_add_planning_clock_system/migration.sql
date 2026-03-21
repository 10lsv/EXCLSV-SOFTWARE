-- Drop old tables if they exist (old schema used ChatterProfile relations)
DROP TABLE IF EXISTS "ClockRecord" CASCADE;
DROP TABLE IF EXISTS "ShiftSchedule" CASCADE;
DROP TYPE IF EXISTS "ShiftSlot" CASCADE;

-- CreateTable ShiftSchedule (new schema: User relation)
CREATE TABLE IF NOT EXISTS "ShiftSchedule" (
    "id" TEXT NOT NULL,
    "chatterId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClockRecord
CREATE TABLE IF NOT EXISTS "ClockRecord" (
    "id" TEXT NOT NULL,
    "chatterId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "autoCloseAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "ticketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClockRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClockTicket
CREATE TABLE IF NOT EXISTS "ClockTicket" (
    "id" TEXT NOT NULL,
    "chatterId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT NOT NULL,
    "screenshotData" TEXT,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "adminComment" TEXT,
    "adjustedClockIn" TIMESTAMP(3),
    "adjustedClockOut" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClockTicket_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ShiftSchedule_chatterId_shiftDate_key" ON "ShiftSchedule"("chatterId", "shiftDate");
CREATE INDEX IF NOT EXISTS "ShiftSchedule_shiftDate_idx" ON "ShiftSchedule"("shiftDate");
CREATE INDEX IF NOT EXISTS "ShiftSchedule_chatterId_idx" ON "ShiftSchedule"("chatterId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClockRecord_chatterId_shiftDate_key" ON "ClockRecord"("chatterId", "shiftDate");
CREATE INDEX IF NOT EXISTS "ClockRecord_shiftDate_idx" ON "ClockRecord"("shiftDate");
CREATE INDEX IF NOT EXISTS "ClockRecord_chatterId_idx" ON "ClockRecord"("chatterId");

CREATE INDEX IF NOT EXISTS "ClockTicket_chatterId_idx" ON "ClockTicket"("chatterId");
CREATE INDEX IF NOT EXISTS "ClockTicket_status_idx" ON "ClockTicket"("status");

-- Foreign keys
ALTER TABLE "ShiftSchedule" DROP CONSTRAINT IF EXISTS "ShiftSchedule_chatterId_fkey";
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_chatterId_fkey"
    FOREIGN KEY ("chatterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClockRecord" DROP CONSTRAINT IF EXISTS "ClockRecord_chatterId_fkey";
ALTER TABLE "ClockRecord" ADD CONSTRAINT "ClockRecord_chatterId_fkey"
    FOREIGN KEY ("chatterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClockTicket" DROP CONSTRAINT IF EXISTS "ClockTicket_chatterId_fkey";
ALTER TABLE "ClockTicket" ADD CONSTRAINT "ClockTicket_chatterId_fkey"
    FOREIGN KEY ("chatterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

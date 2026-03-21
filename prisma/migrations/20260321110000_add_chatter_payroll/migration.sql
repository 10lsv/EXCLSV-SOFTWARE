CREATE TABLE IF NOT EXISTS "ChatterPayroll" (
    "id" TEXT NOT NULL,
    "chatterId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "tipsMessagesGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPay" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatterPayroll_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChatterPayroll_chatterId_periodStart_key" ON "ChatterPayroll"("chatterId", "periodStart");
CREATE INDEX IF NOT EXISTS "ChatterPayroll_chatterId_idx" ON "ChatterPayroll"("chatterId");
CREATE INDEX IF NOT EXISTS "ChatterPayroll_status_idx" ON "ChatterPayroll"("status");
ALTER TABLE "ChatterPayroll" DROP CONSTRAINT IF EXISTS "ChatterPayroll_chatterId_fkey";
ALTER TABLE "ChatterPayroll" ADD CONSTRAINT "ChatterPayroll_chatterId_fkey" FOREIGN KEY ("chatterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

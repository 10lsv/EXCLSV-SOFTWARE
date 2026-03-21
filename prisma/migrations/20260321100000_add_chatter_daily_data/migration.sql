CREATE TABLE IF NOT EXISTS "ChatterDailyData" (
    "id" TEXT NOT NULL,
    "chatterId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "salesGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ppvSalesGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipsGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "messagesGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduledHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clockedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatterDailyData_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChatterDailyData_chatterId_modelId_date_key" ON "ChatterDailyData"("chatterId", "modelId", "date");
CREATE INDEX IF NOT EXISTS "ChatterDailyData_chatterId_idx" ON "ChatterDailyData"("chatterId");
CREATE INDEX IF NOT EXISTS "ChatterDailyData_modelId_idx" ON "ChatterDailyData"("modelId");
ALTER TABLE "ChatterDailyData" DROP CONSTRAINT IF EXISTS "ChatterDailyData_chatterId_fkey";
ALTER TABLE "ChatterDailyData" ADD CONSTRAINT "ChatterDailyData_chatterId_fkey" FOREIGN KEY ("chatterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatterDailyData" DROP CONSTRAINT IF EXISTS "ChatterDailyData_modelId_fkey";
ALTER TABLE "ChatterDailyData" ADD CONSTRAINT "ChatterDailyData_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

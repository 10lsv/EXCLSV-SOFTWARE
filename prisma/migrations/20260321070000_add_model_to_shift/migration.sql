-- Add modelId to ShiftSchedule
ALTER TABLE "ShiftSchedule" ADD COLUMN IF NOT EXISTS "modelId" TEXT;

-- Drop old unique constraint and add new one
ALTER TABLE "ShiftSchedule" DROP CONSTRAINT IF EXISTS "ShiftSchedule_chatterId_shiftDate_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ShiftSchedule_chatterId_shiftDate_modelId_key"
  ON "ShiftSchedule"("chatterId", "shiftDate", "modelId");

-- Add modelId index and FK
CREATE INDEX IF NOT EXISTS "ShiftSchedule_modelId_idx" ON "ShiftSchedule"("modelId");
ALTER TABLE "ShiftSchedule" DROP CONSTRAINT IF EXISTS "ShiftSchedule_modelId_fkey";
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_modelId_fkey"
  FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

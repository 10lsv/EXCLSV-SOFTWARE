-- Change unique constraint from (chatterId, shiftDate, modelId) to (shiftDate, shiftType, modelId)
-- This allows: one chatter per model per shift per day
-- But a chatter CAN manage multiple models on the same shift/day
DROP INDEX IF EXISTS "ShiftSchedule_chatterId_shiftDate_modelId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ShiftSchedule_shiftDate_shiftType_modelId_key"
  ON "ShiftSchedule"("shiftDate", "shiftType", "modelId");

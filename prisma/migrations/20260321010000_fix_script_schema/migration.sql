-- Script: rename scene→category, add new columns, make targetAudience nullable
ALTER TABLE "Script" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Script" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Script" ADD COLUMN IF NOT EXISTS "targetPrice" DOUBLE PRECISION;
ALTER TABLE "Script" ALTER COLUMN "targetAudience" DROP NOT NULL;

-- Migrate data from scene to category if scene exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Script' AND column_name = 'scene') THEN
    UPDATE "Script" SET "category" = "scene" WHERE "category" IS NULL;
    ALTER TABLE "Script" DROP COLUMN "scene";
  END IF;
END $$;

-- Drop expectedRevenue if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Script' AND column_name = 'expectedRevenue') THEN
    ALTER TABLE "Script" DROP COLUMN "expectedRevenue";
  END IF;
END $$;

-- Set category NOT NULL with default for any remaining nulls
UPDATE "Script" SET "category" = 'UPSELL' WHERE "category" IS NULL;
ALTER TABLE "Script" ALTER COLUMN "category" SET NOT NULL;

-- ScriptStep: add title and notes columns
ALTER TABLE "ScriptStep" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScriptStep" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "ScriptStep" ALTER COLUMN "type" SET DEFAULT 'message';

-- ScriptContentTask: add outfit, fix cascade
ALTER TABLE "ScriptContentTask" ADD COLUMN IF NOT EXISTS "outfit" TEXT;

-- Fix ScriptContentTask foreign key to cascade on delete
ALTER TABLE "ScriptContentTask" DROP CONSTRAINT IF EXISTS "ScriptContentTask_scriptId_fkey";
ALTER TABLE "ScriptContentTask" ADD CONSTRAINT "ScriptContentTask_scriptId_fkey"
  FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

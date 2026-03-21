-- Drop old tables/constraints if they exist
DROP TABLE IF EXISTS "ScriptContentTask" CASCADE;
DROP TABLE IF EXISTS "ScriptMedia" CASCADE;
DROP TABLE IF EXISTS "ScriptElement" CASCADE;
DROP TABLE IF EXISTS "ScriptStep" CASCADE;
DROP TABLE IF EXISTS "Script" CASCADE;
DROP TYPE IF EXISTS "ScriptStatus" CASCADE;

-- Create Script
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- Create ScriptStep
CREATE TABLE "ScriptStep" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScriptStep_pkey" PRIMARY KEY ("id")
);

-- Create ScriptElement
CREATE TABLE "ScriptElement" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "messageText" TEXT,
    "waitDescription" TEXT,
    "noteText" TEXT,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScriptElement_pkey" PRIMARY KEY ("id")
);

-- Create ScriptMedia
CREATE TABLE "ScriptMedia" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "outfit" TEXT,
    "duration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "driveLink" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScriptMedia_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ScriptStep_scriptId_order_idx" ON "ScriptStep"("scriptId", "order");
CREATE INDEX "ScriptElement_stepId_order_idx" ON "ScriptElement"("stepId", "order");
CREATE INDEX "ScriptMedia_elementId_idx" ON "ScriptMedia"("elementId");

-- Foreign keys
ALTER TABLE "Script" ADD CONSTRAINT "Script_modelId_fkey"
    FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptStep" ADD CONSTRAINT "ScriptStep_scriptId_fkey"
    FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptElement" ADD CONSTRAINT "ScriptElement_stepId_fkey"
    FOREIGN KEY ("stepId") REFERENCES "ScriptStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptMedia" ADD CONSTRAINT "ScriptMedia_elementId_fkey"
    FOREIGN KEY ("elementId") REFERENCES "ScriptElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

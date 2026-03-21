/*
  Warnings:

  - You are about to drop the column `targetAudience` on the `Script` table. All the data in the column will be lost.
  - You are about to drop the column `targetPrice` on the `Script` table. All the data in the column will be lost.
  - The `status` column on the `Script` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `content` on the `ScriptStep` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `ScriptStep` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `ScriptStep` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `ScriptStep` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ScriptStep` table. All the data in the column will be lost.
  - You are about to drop the column `waitDuration` on the `ScriptStep` table. All the data in the column will be lost.
  - You are about to drop the `ScriptContentTask` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `order` to the `ScriptStep` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ScriptStep` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Script" DROP CONSTRAINT "Script_modelId_fkey";

-- DropForeignKey
ALTER TABLE "ScriptContentTask" DROP CONSTRAINT "ScriptContentTask_modelId_fkey";

-- DropForeignKey
ALTER TABLE "ScriptContentTask" DROP CONSTRAINT "ScriptContentTask_scriptId_fkey";

-- AlterTable
ALTER TABLE "Script" DROP COLUMN "targetAudience",
DROP COLUMN "targetPrice",
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ScriptStep" DROP COLUMN "content",
DROP COLUMN "notes",
DROP COLUMN "price",
DROP COLUMN "sortOrder",
DROP COLUMN "type",
DROP COLUMN "waitDuration",
ADD COLUMN     "order" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "title" DROP DEFAULT;

-- DropTable
DROP TABLE "ScriptContentTask";

-- DropEnum
DROP TYPE "ScriptStatus";

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX "ScriptElement_stepId_order_idx" ON "ScriptElement"("stepId", "order");

-- CreateIndex
CREATE INDEX "ScriptMedia_elementId_idx" ON "ScriptMedia"("elementId");

-- CreateIndex
CREATE INDEX "ScriptStep_scriptId_order_idx" ON "ScriptStep"("scriptId", "order");

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptElement" ADD CONSTRAINT "ScriptElement_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ScriptStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptMedia" ADD CONSTRAINT "ScriptMedia_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "ScriptElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

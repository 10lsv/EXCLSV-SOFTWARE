-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'CHATTER_MANAGER', 'CHATTER', 'MODEL');

-- CreateEnum
CREATE TYPE "CustomStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('DRAFT', 'VALIDATED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('PHOTO', 'VIDEO', 'AUDIO', 'COMBO');

-- CreateEnum
CREATE TYPE "ShiftSlot" AS ENUM ('SHIFT_A', 'SHIFT_B', 'SHIFT_C');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "location" TEXT,
    "timezone" TEXT,
    "occupation" TEXT,
    "languages" TEXT[],
    "photoUrl" TEXT,
    "height" TEXT,
    "hairColor" TEXT,
    "eyeColor" TEXT,
    "tattoos" TEXT,
    "piercings" TEXT,
    "style" TEXT,
    "distinctFeatures" TEXT,
    "personalityTraits" TEXT,
    "acceptedContent" TEXT[],
    "boundaries" TEXT,
    "sexualizationLevel" TEXT,
    "personalityNotes" TEXT,
    "onlyfansUrl" TEXT,
    "instagramUrl" TEXT,
    "instagramHandle" TEXT,
    "tiktokUrl" TEXT,
    "tiktokHandle" TEXT,
    "twitterUrl" TEXT,
    "twitterHandle" TEXT,
    "redditUrl" TEXT,
    "redditHandle" TEXT,
    "threadsUrl" TEXT,
    "threadsHandle" TEXT,
    "otherSocials" JSONB,
    "contractSignedAt" TIMESTAMP(3),
    "contractFileUrl" TEXT,
    "agencyPercentage" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "billingFrequency" TEXT NOT NULL DEFAULT 'bimonthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatterAssignment" (
    "id" TEXT NOT NULL,
    "chatterId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatterAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomContent" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contentType" "ContentType"[],
    "duration" TEXT,
    "outfit" TEXT,
    "clientCategory" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "amountCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "CustomStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "driveLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomMessage" (
    "id" TEXT NOT NULL,
    "customId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyContentTemplate" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "driveLink" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyContentTask" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "templateId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "targetQuantity" INTEGER NOT NULL,
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "CustomStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "driveLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyContentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "expectedRevenue" TEXT,
    "status" "ScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptStep" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "waitDuration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptContentTask" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "duration" TEXT,
    "status" "CustomStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "driveLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptContentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSchedule" (
    "id" TEXT NOT NULL,
    "chatterId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" "ShiftSlot" NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClockRecord" (
    "id" TEXT NOT NULL,
    "chatterId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "shiftSlot" "ShiftSlot" NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClockRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InflowwDailyData" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subsGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipsGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "messagesGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "postsGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streamsGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralsGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarningsGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contributionPct" DOUBLE PRECISION,
    "ofRanking" INTEGER,
    "following" INTEGER,
    "fansWithRenew" INTEGER,
    "renewOnPct" DOUBLE PRECISION,
    "newFans" INTEGER,
    "activeFans" INTEGER,
    "expiredFanChange" INTEGER,
    "postsGrossCount" DOUBLE PRECISION,
    "messagesGrossCount" DOUBLE PRECISION,
    "streamsGrossCount" DOUBLE PRECISION,
    "refundGross" DOUBLE PRECISION,
    "creatorGross" DOUBLE PRECISION,
    "creatorGroupGross" DOUBLE PRECISION,
    "avgSpendPerSpender" DOUBLE PRECISION,
    "avgSpendPerTransaction" DOUBLE PRECISION,
    "avgEarningsPerFan" DOUBLE PRECISION,
    "avgSubscriptionLength" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InflowwDailyData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelInvoice" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossRevenue" DOUBLE PRECISION NOT NULL,
    "ofFees" DOUBLE PRECISION NOT NULL,
    "netRevenue" DOUBLE PRECISION NOT NULL,
    "agencyShare" DOUBLE PRECISION NOT NULL,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "subsRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipsRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "messagesRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "postsRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streamsRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralsRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "beneficiaries" JSONB,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "overdueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingPipeline" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "assignedToId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ModelProfile_userId_key" ON "ModelProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatterProfile_userId_key" ON "ChatterProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatterAssignment_chatterId_modelId_key" ON "ChatterAssignment"("chatterId", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyContentTemplate_modelId_category_platform_key" ON "WeeklyContentTemplate"("modelId", "category", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftSchedule_chatterId_date_slot_key" ON "ShiftSchedule"("chatterId", "date", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "InflowwDailyData_modelId_date_key" ON "InflowwDailyData"("modelId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingPipeline_modelId_key" ON "OnboardingPipeline"("modelId");

-- AddForeignKey
ALTER TABLE "ModelProfile" ADD CONSTRAINT "ModelProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterProfile" ADD CONSTRAINT "ChatterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterAssignment" ADD CONSTRAINT "ChatterAssignment_chatterId_fkey" FOREIGN KEY ("chatterId") REFERENCES "ChatterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterAssignment" ADD CONSTRAINT "ChatterAssignment_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomContent" ADD CONSTRAINT "CustomContent_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomContent" ADD CONSTRAINT "CustomContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "ChatterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomMessage" ADD CONSTRAINT "CustomMessage_customId_fkey" FOREIGN KEY ("customId") REFERENCES "CustomContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyContentTemplate" ADD CONSTRAINT "WeeklyContentTemplate_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyContentTask" ADD CONSTRAINT "WeeklyContentTask_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptStep" ADD CONSTRAINT "ScriptStep_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptContentTask" ADD CONSTRAINT "ScriptContentTask_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptContentTask" ADD CONSTRAINT "ScriptContentTask_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_chatterId_fkey" FOREIGN KEY ("chatterId") REFERENCES "ChatterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClockRecord" ADD CONSTRAINT "ClockRecord_chatterId_fkey" FOREIGN KEY ("chatterId") REFERENCES "ChatterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InflowwDailyData" ADD CONSTRAINT "InflowwDailyData_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelInvoice" ADD CONSTRAINT "ModelInvoice_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingPipeline" ADD CONSTRAINT "OnboardingPipeline_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

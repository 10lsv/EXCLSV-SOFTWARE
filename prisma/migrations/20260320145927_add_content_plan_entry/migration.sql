-- CreateTable
CREATE TABLE "ContentPlanEntry" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPlanEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContentPlanEntry" ADD CONSTRAINT "ContentPlanEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WeeklyContentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

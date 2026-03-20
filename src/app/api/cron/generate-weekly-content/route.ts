import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonSuccess, jsonError } from "@/lib/api-utils";
import { getMondayUTC } from "@/lib/utils";

// POST /api/cron/generate-weekly-content — génération automatique chaque lundi
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return jsonError("Non autorisé", 401);
  }

  const monday = getMondayUTC();
  let totalCreated = 0;
  let modelsProcessed = 0;

  const models = await prisma.modelProfile.findMany({
    select: { id: true, stageName: true },
  });

  for (const model of models) {
    // Vérifier si les tasks existent déjà pour cette semaine
    const existing = await prisma.weeklyContentTask.count({
      where: { modelId: model.id, weekStart: monday },
    });

    if (existing > 0) continue;

    const templates = await prisma.weeklyContentTemplate.findMany({
      where: { modelId: model.id, isActive: true },
      orderBy: [{ platform: "asc" }, { sortOrder: "asc" }],
    });

    if (templates.length === 0) continue;

    const result = await prisma.weeklyContentTask.createMany({
      data: templates.map((t) => ({
        modelId: model.id,
        templateId: t.id,
        weekStart: monday,
        category: t.category,
        platform: t.platform,
        targetQuantity: t.quantity,
        completedQuantity: 0,
        status: "NOT_STARTED" as const,
        driveLink: t.driveLink,
      })),
    });

    totalCreated += result.count;
    modelsProcessed++;
  }

  return jsonSuccess({
    weekStart: monday.toISOString(),
    modelsProcessed,
    totalCreated,
    totalModels: models.length,
  });
}

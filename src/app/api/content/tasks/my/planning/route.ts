import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";
import { getMondayUTC } from "@/lib/utils";

// GET /api/content/tasks/my/planning — tâches + entrées de planning pour la semaine
export async function GET(req: NextRequest) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const modelProfile = await prisma.modelProfile.findUnique({
    where: { userId: session!.user.id },
    select: { id: true },
  });

  if (!modelProfile) return jsonError("Profil modèle introuvable", 404);

  // Semaine demandée ou semaine courante
  const weekStartParam = req.nextUrl.searchParams.get("weekStart");
  let monday: Date;

  if (weekStartParam) {
    monday = getMondayUTC(new Date(weekStartParam));
  } else {
    monday = getMondayUTC();
  }

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  let tasks = await prisma.weeklyContentTask.findMany({
    where: { modelId: modelProfile.id, weekStart: monday },
    include: {
      planEntries: {
        where: {
          plannedDate: { gte: monday, lte: sunday },
        },
        orderBy: { plannedDate: "asc" },
      },
    },
    orderBy: [{ platform: "asc" }, { category: "asc" }],
  });

  // Auto-génération si aucune tâche pour cette semaine
  if (tasks.length === 0) {
    const templates = await prisma.weeklyContentTemplate.findMany({
      where: { modelId: modelProfile.id, isActive: true },
      orderBy: [{ platform: "asc" }, { sortOrder: "asc" }],
    });

    if (templates.length > 0) {
      await prisma.weeklyContentTask.createMany({
        data: templates.map((t) => ({
          modelId: modelProfile.id,
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

      tasks = await prisma.weeklyContentTask.findMany({
        where: { modelId: modelProfile.id, weekStart: monday },
        include: {
          planEntries: {
            where: {
              plannedDate: { gte: monday, lte: sunday },
            },
            orderBy: { plannedDate: "asc" },
          },
        },
        orderBy: [{ platform: "asc" }, { category: "asc" }],
      });
    }
  }

  return jsonSuccess({
    tasks,
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  });
}

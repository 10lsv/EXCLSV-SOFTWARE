import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

function getWeekRange(date: Date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return { monday, nextMonday };
}

// GET /api/content/tasks/my — tâches de la semaine en cours pour la modèle connectée
export async function GET(_req: NextRequest) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const modelProfile = await prisma.modelProfile.findUnique({
    where: { userId: session!.user.id },
    select: { id: true },
  });

  if (!modelProfile) return jsonError("Profil modèle introuvable", 404);

  const { monday, nextMonday } = getWeekRange();

  let tasks = await prisma.weeklyContentTask.findMany({
    where: {
      modelId: modelProfile.id,
      weekStart: { gte: monday, lt: nextMonday },
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
        where: {
          modelId: modelProfile.id,
          weekStart: { gte: monday, lt: nextMonday },
        },
        orderBy: [{ platform: "asc" }, { category: "asc" }],
      });
    }
  }

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return jsonSuccess({
    tasks,
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  });
}

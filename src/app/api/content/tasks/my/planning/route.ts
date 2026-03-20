import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

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
    monday = new Date(weekStartParam);
    monday.setHours(0, 0, 0, 0);
  } else {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const tasks = await prisma.weeklyContentTask.findMany({
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

  return jsonSuccess({
    tasks,
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  });
}

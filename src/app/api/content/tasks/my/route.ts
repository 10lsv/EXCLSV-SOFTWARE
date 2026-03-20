import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";
import { getMondayUTC } from "@/lib/utils";

// GET /api/content/tasks/my — tâches de la semaine en cours pour la modèle connectée
export async function GET(req: NextRequest) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const modelProfile = await prisma.modelProfile.findUnique({
    where: { userId: session!.user.id },
    select: { id: true },
  });

  if (!modelProfile) return jsonError("Profil modèle introuvable", 404);

  const monday = getMondayUTC();

  const tasks = await prisma.weeklyContentTask.findMany({
    where: { modelId: modelProfile.id, weekStart: monday },
    orderBy: [{ platform: "asc" }, { category: "asc" }],
  });

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return jsonSuccess({
    tasks,
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  });
}

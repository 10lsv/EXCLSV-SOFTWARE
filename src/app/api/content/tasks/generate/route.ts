import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// POST /api/content/tasks/generate — générer les tâches d'une semaine depuis le template
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const body = await req.json();
  const { modelId, weekStart: weekStartStr } = body;

  if (!modelId || !weekStartStr) {
    return jsonError("modelId et weekStart requis");
  }

  const weekStart = new Date(weekStartStr);
  weekStart.setHours(0, 0, 0, 0);

  // Récupérer les templates actifs
  const templates = await prisma.weeklyContentTemplate.findMany({
    where: { modelId, isActive: true },
    orderBy: [{ platform: "asc" }, { sortOrder: "asc" }],
  });

  if (templates.length === 0) {
    return jsonError("Aucun template actif pour cette modèle");
  }

  // Supprimer les tâches existantes de cette semaine pour cette modèle
  await prisma.weeklyContentTask.deleteMany({
    where: { modelId, weekStart },
  });

  // Créer les nouvelles tâches
  const tasks = await prisma.weeklyContentTask.createMany({
    data: templates.map((t) => ({
      modelId,
      templateId: t.id,
      weekStart,
      category: t.category,
      platform: t.platform,
      targetQuantity: t.quantity,
      completedQuantity: 0,
      status: "NOT_STARTED" as const,
      driveLink: t.driveLink,
    })),
  });

  await logAudit(session!.user.id, "GENERATE_TASKS", "WeeklyContentTask", undefined, {
    modelId,
    weekStart: weekStartStr,
    count: tasks.count,
  });

  return jsonSuccess({ generated: tasks.count });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// PATCH /api/content/tasks/[id]/progress — incrémenter/décrémenter (modèle)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const task = await prisma.weeklyContentTask.findUnique({
    where: { id: params.id },
  });
  if (!task) return jsonError("Tâche introuvable", 404);

  // Vérifier que la tâche appartient à la modèle connectée
  const role = session!.user.role as Role;
  if (role === Role.MODEL) {
    const modelProfile = await prisma.modelProfile.findUnique({
      where: { userId: session!.user.id },
      select: { id: true },
    });
    if (!modelProfile || modelProfile.id !== task.modelId) {
      return jsonError("Accès interdit", 403);
    }
  }

  const body = await req.json();
  const delta = parseInt(body.delta); // +1 ou -1
  if (isNaN(delta) || (delta !== 1 && delta !== -1)) {
    return jsonError("delta doit être 1 ou -1");
  }

  const newCompleted = Math.max(0, Math.min(task.targetQuantity, task.completedQuantity + delta));

  // Statut automatique
  const status =
    newCompleted === 0
      ? ("NOT_STARTED" as const)
      : newCompleted >= task.targetQuantity
        ? ("COMPLETED" as const)
        : ("IN_PROGRESS" as const);

  const updated = await prisma.weeklyContentTask.update({
    where: { id: params.id },
    data: { completedQuantity: newCompleted, status },
  });

  return jsonSuccess(updated);
}

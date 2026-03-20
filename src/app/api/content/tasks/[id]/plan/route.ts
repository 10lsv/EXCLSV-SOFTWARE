import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// PATCH /api/content/tasks/[id]/plan — ajouter une entrée de planning
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const body = await req.json();
  const { plannedDate, quantity } = body;

  if (!plannedDate || !quantity || quantity < 1) {
    return jsonError("plannedDate et quantity (>= 1) requis", 400);
  }

  const task = await prisma.weeklyContentTask.findUnique({
    where: { id: params.id },
    include: { model: { select: { userId: true } }, planEntries: true },
  });

  if (!task) return jsonError("Tâche introuvable", 404);

  // Vérifier que la modèle ne modifie que ses propres tâches
  if (session!.user.role === "MODEL" && task.model.userId !== session!.user.id) {
    return jsonError("Accès interdit", 403);
  }

  // Vérifier que la quantité totale planifiée ne dépasse pas targetQuantity
  const alreadyPlanned = task.planEntries.reduce((s, e) => s + e.quantity, 0);
  if (alreadyPlanned + quantity > task.targetQuantity) {
    return jsonError(
      `Quantité max dépassée. Reste ${task.targetQuantity - alreadyPlanned} à planifier.`,
      400
    );
  }

  const entry = await prisma.contentPlanEntry.create({
    data: {
      taskId: params.id,
      plannedDate: new Date(plannedDate),
      quantity,
    },
  });

  return jsonSuccess(entry, 201);
}

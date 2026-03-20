import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// PATCH /api/content/tasks/[id] — modifier une tâche (quantité, statut)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const task = await prisma.weeklyContentTask.findUnique({
    where: { id: params.id },
  });
  if (!task) return jsonError("Tâche introuvable", 404);

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.targetQuantity !== undefined) data.targetQuantity = parseInt(body.targetQuantity);
  if (body.completedQuantity !== undefined) data.completedQuantity = parseInt(body.completedQuantity);
  if (body.status !== undefined) data.status = body.status;
  if (body.driveLink !== undefined) data.driveLink = body.driveLink || null;

  const updated = await prisma.weeklyContentTask.update({
    where: { id: params.id },
    data,
  });

  await logAudit(session!.user.id, "UPDATE_TASK", "WeeklyContentTask", params.id, data);

  return jsonSuccess(updated);
}

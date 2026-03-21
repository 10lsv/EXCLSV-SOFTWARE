import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { stepId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const updated = await prisma.scriptStep.update({
      where: { id: params.stepId },
      data: { ...(body.title !== undefined && { title: body.title }) },
    });
    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[STEP PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { stepId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const step = await prisma.scriptStep.findUnique({
      where: { id: params.stepId },
      select: { scriptId: true, order: true },
    });
    if (!step) return jsonError("Étape introuvable", 404);

    await prisma.scriptStep.delete({ where: { id: params.stepId } });

    // Reorder remaining steps
    await prisma.scriptStep.updateMany({
      where: { scriptId: step.scriptId, order: { gt: step.order } },
      data: { order: { decrement: 1 } },
    });

    return jsonSuccess({ deleted: true });
  } catch (err: unknown) {
    console.error("[STEP DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

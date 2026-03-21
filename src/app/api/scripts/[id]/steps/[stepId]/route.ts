import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// PATCH /api/scripts/[id]/steps/[stepId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const step = await prisma.scriptStep.findUnique({ where: { id: params.stepId } });
  if (!step || step.scriptId !== params.id) return jsonError("Étape introuvable", 404);

  const body = await req.json();

  const updated = await prisma.scriptStep.update({
    where: { id: params.stepId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.price !== undefined && { price: body.price ? parseFloat(body.price) : null }),
      ...(body.waitDuration !== undefined && { waitDuration: body.waitDuration }),
    },
  });

  return jsonSuccess(updated);
}

// DELETE /api/scripts/[id]/steps/[stepId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const step = await prisma.scriptStep.findUnique({ where: { id: params.stepId } });
  if (!step || step.scriptId !== params.id) return jsonError("Étape introuvable", 404);

  await prisma.scriptStep.delete({ where: { id: params.stepId } });

  return jsonSuccess({ deleted: true });
}

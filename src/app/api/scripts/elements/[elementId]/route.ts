import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { elementId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const updated = await prisma.scriptElement.update({
      where: { id: params.elementId },
      data: {
        ...(body.messageText !== undefined && { messageText: body.messageText }),
        ...(body.waitDescription !== undefined && { waitDescription: body.waitDescription }),
        ...(body.noteText !== undefined && { noteText: body.noteText }),
        ...(body.price !== undefined && { price: body.price ? parseFloat(String(body.price)) : null }),
      },
      include: { medias: true },
    });
    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[ELEMENT PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { elementId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const el = await prisma.scriptElement.findUnique({
      where: { id: params.elementId },
      select: { stepId: true, order: true },
    });
    if (!el) return jsonError("Élément introuvable", 404);

    await prisma.scriptElement.delete({ where: { id: params.elementId } });
    await prisma.scriptElement.updateMany({
      where: { stepId: el.stepId, order: { gt: el.order } },
      data: { order: { decrement: 1 } },
    });

    return jsonSuccess({ deleted: true });
  } catch (err: unknown) {
    console.error("[ELEMENT DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

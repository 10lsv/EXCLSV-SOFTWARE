import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

const fullInclude = {
  model: { select: { id: true, stageName: true, photoUrl: true, userId: true } },
  steps: {
    orderBy: { order: "asc" as const },
    include: {
      elements: {
        orderBy: { order: "asc" as const },
        include: { medias: { orderBy: { order: "asc" as const } } },
      },
    },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN, Role.CHATTER_MANAGER, Role.MODEL);
  if (error) return error;

  try {
    const script = await prisma.script.findUnique({
      where: { id: params.id },
      include: fullInclude,
    });
    if (!script) return jsonError("Script introuvable", 404);
    return jsonSuccess(script);
  } catch (err: unknown) {
    console.error("[SCRIPT GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const existing = await prisma.script.findUnique({
      where: { id: params.id },
      include: { model: { select: { userId: true } } },
    });
    if (!existing) return jsonError("Script introuvable", 404);

    const updated = await prisma.script.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.status !== undefined && { status: body.status }),
      },
      include: fullInclude,
    });

    if (body.status === "VALIDATED" && existing.status === "DRAFT") {
      await createNotification({
        userId: existing.model.userId,
        type: "SCRIPT_VALIDATED",
        title: "Nouveau script à préparer",
        message: `Le script "${existing.name}" a été validé.`,
        link: `/model/scripts/${params.id}`,
      });
    }

    await logAudit(session!.user.id, "UPDATE_SCRIPT", "Script", params.id, { fields: Object.keys(body) });
    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[SCRIPT PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    await prisma.script.delete({ where: { id: params.id } });
    await logAudit(session!.user.id, "DELETE_SCRIPT", "Script", params.id);
    return jsonSuccess({ deleted: true });
  } catch (err: unknown) {
    console.error("[SCRIPT DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

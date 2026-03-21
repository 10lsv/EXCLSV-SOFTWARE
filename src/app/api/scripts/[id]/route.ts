import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

// GET /api/scripts/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN, Role.CHATTER_MANAGER, Role.MODEL);
  if (error) return error;

  try {
    const script = await prisma.script.findUnique({
      where: { id: params.id },
      include: {
        model: { select: { id: true, stageName: true, photoUrl: true, userId: true } },
        steps: { orderBy: { sortOrder: "asc" } },
        contentTasks: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!script) return jsonError("Script introuvable", 404);

    return jsonSuccess(script);
  } catch (err: unknown) {
    console.error("[SCRIPTS GET ID]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// PATCH /api/scripts/[id]
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
      include: { model: { select: { userId: true, stageName: true } } },
    });
    if (!existing) return jsonError("Script introuvable", 404);

    const updated = await prisma.script.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.targetPrice !== undefined && { targetPrice: body.targetPrice ? parseFloat(String(body.targetPrice)) : null }),
        ...(body.targetAudience !== undefined && { targetAudience: body.targetAudience }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.status !== undefined && { status: body.status }),
      },
      include: {
        model: { select: { id: true, stageName: true, photoUrl: true, userId: true } },
        steps: { orderBy: { sortOrder: "asc" } },
        contentTasks: { orderBy: { createdAt: "asc" } },
      },
    });

    if (body.status === "VALIDATED" && existing.status === "DRAFT") {
      await createNotification({
        userId: existing.model.userId,
        type: "SCRIPT_VALIDATED",
        title: "Nouveau script à préparer",
        message: `Le script "${existing.name}" a été validé. Préparez les contenus requis.`,
        link: `/model/scripts/${params.id}`,
      });
    }

    await logAudit(session!.user.id, "UPDATE_SCRIPT", "Script", params.id, { fields: Object.keys(body) });

    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[SCRIPTS PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// DELETE /api/scripts/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const existing = await prisma.script.findUnique({ where: { id: params.id } });
    if (!existing) return jsonError("Script introuvable", 404);

    await prisma.script.delete({ where: { id: params.id } });

    await logAudit(session!.user.id, "DELETE_SCRIPT", "Script", params.id);

    return jsonSuccess({ deleted: true });
  } catch (err: unknown) {
    console.error("[SCRIPTS DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

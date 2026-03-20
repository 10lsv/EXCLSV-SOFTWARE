import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { updateCustomSchema } from "@/lib/validations/custom";
import { createNotification, notifyAdmins, truncate } from "@/lib/notifications";

async function getCustomWithAccess(customId: string, userId: string, role: Role) {
  const custom = await prisma.customContent.findUnique({
    where: { id: customId },
    include: {
      model: { select: { id: true, stageName: true, photoUrl: true, userId: true } },
      createdBy: {
        include: { user: { select: { id: true, name: true } } },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          custom: { select: { id: true } },
        },
      },
      _count: { select: { messages: true } },
    },
  });

  if (!custom) return { custom: null, error: "Custom introuvable" };

  // Data isolation checks
  if (role === Role.MODEL) {
    if (custom.model.userId !== userId) {
      return { custom: null, error: "Accès interdit" };
    }
  } else if (role === Role.CHATTER) {
    const chatterProfile = await prisma.chatterProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!chatterProfile) return { custom: null, error: "Profil chatter introuvable" };

    const assignment = await prisma.chatterAssignment.findFirst({
      where: {
        chatterId: chatterProfile.id,
        modelId: custom.modelId,
        isActive: true,
      },
    });
    if (!assignment) return { custom: null, error: "Accès interdit" };
  }

  return { custom, error: null };
}

// GET /api/customs/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(
    Role.OWNER,
    Role.ADMIN,
    Role.CHATTER_MANAGER,
    Role.CHATTER,
    Role.MODEL
  );
  if (error) return error;

  const role = session!.user.role as Role;
  const result = await getCustomWithAccess(params.id, session!.user.id, role);

  if (result.error) {
    return jsonError(result.error, result.custom === null ? 404 : 403);
  }

  // Enrich messages with sender info
  const senderIds = Array.from(new Set(result.custom!.messages.map((m) => m.senderId)));
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true, role: true },
  });
  const senderMap = new Map(senders.map((s) => [s.id, s]));

  const messages = result.custom!.messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt,
    sender: senderMap.get(m.senderId) || { name: "Inconnu", role: "UNKNOWN" },
  }));

  return jsonSuccess({ ...result.custom, messages });
}

// PATCH /api/customs/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(
    Role.OWNER,
    Role.ADMIN,
    Role.CHATTER,
    Role.MODEL
  );
  if (error) return error;

  const body = await req.json();
  const parsed = updateCustomSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message);
  }

  const role = session!.user.role as Role;
  const userId = session!.user.id;

  const existing = await prisma.customContent.findUnique({
    where: { id: params.id },
    include: { model: { select: { userId: true } } },
  });

  if (!existing) return jsonError("Custom introuvable", 404);

  // Permission checks
  if (role === Role.MODEL) {
    if (existing.model.userId !== userId) {
      return jsonError("Accès interdit", 403);
    }
    // MODEL can only update status
    const data = parsed.data;
    const allowedKeys = ["status"];
    const requestedKeys = Object.keys(data);
    const forbidden = requestedKeys.filter((k) => !allowedKeys.includes(k));
    if (forbidden.length > 0) {
      return jsonError(`Modification non autorisée : ${forbidden.join(", ")}`, 403);
    }
  } else if (role === Role.CHATTER) {
    const chatterProfile = await prisma.chatterProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!chatterProfile) return jsonError("Profil chatter introuvable", 404);

    const assignment = await prisma.chatterAssignment.findFirst({
      where: {
        chatterId: chatterProfile.id,
        modelId: existing.modelId,
        isActive: true,
      },
    });
    if (!assignment) return jsonError("Accès interdit", 403);
  }

  const data = parsed.data;
  const updated = await prisma.customContent.update({
    where: { id: params.id },
    data: {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.contentType !== undefined && { contentType: data.contentType }),
      ...(data.duration !== undefined && { duration: data.duration || null }),
      ...(data.outfit !== undefined && { outfit: data.outfit || null }),
      ...(data.clientCategory !== undefined && { clientCategory: data.clientCategory }),
      ...(data.clientHandle !== undefined && { clientHandle: data.clientHandle || null }),
      ...(data.totalPrice !== undefined && { totalPrice: data.totalPrice }),
      ...(data.amountCollected !== undefined && { amountCollected: data.amountCollected }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.driveLink !== undefined && { driveLink: data.driveLink || null }),
    },
    include: {
      model: { select: { id: true, stageName: true, photoUrl: true } },
      createdBy: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  await logAudit(
    session!.user.id,
    "UPDATE_CUSTOM",
    "CustomContent",
    params.id,
    { fields: Object.keys(data) }
  );

  // ─── Notifications on status change ───
  if (data.status && data.status !== existing.status) {
    const modelName = updated.model.stageName;
    const descShort = truncate(existing.description);

    // Récupérer le userId du chatter qui a créé le custom
    const chatterUser = updated.createdBy.user;

    if (data.status === "IN_PROGRESS") {
      await createNotification({
        userId: chatterUser.id,
        type: "CUSTOM_IN_PROGRESS",
        title: "Custom en cours",
        message: `${modelName} a commencé à travailler sur le custom — ${descShort}`,
        link: `/chatter/customs/${params.id}`,
      });
      await notifyAdmins({
        type: "CUSTOM_IN_PROGRESS",
        title: "Custom en cours",
        message: `${modelName} a commencé à travailler sur le custom — ${descShort}`,
        link: `/admin/customs/${params.id}`,
      });
    } else if (data.status === "COMPLETED") {
      await createNotification({
        userId: chatterUser.id,
        type: "CUSTOM_COMPLETED",
        title: "Custom terminé",
        message: `${modelName} a terminé le custom — ${descShort}. Prêt à envoyer !`,
        link: `/chatter/customs/${params.id}`,
      });
      await notifyAdmins({
        type: "CUSTOM_COMPLETED",
        title: "Custom terminé",
        message: `${modelName} a terminé le custom — ${descShort}. Prêt à envoyer !`,
        link: `/admin/customs/${params.id}`,
      });
    }
  }

  return jsonSuccess(updated);
}

// DELETE /api/customs/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const existing = await prisma.customContent.findUnique({
    where: { id: params.id },
    select: { id: true, description: true, modelId: true },
  });

  if (!existing) return jsonError("Custom introuvable", 404);

  // Delete messages first, then custom
  await prisma.$transaction([
    prisma.customMessage.deleteMany({ where: { customId: params.id } }),
    prisma.customContent.delete({ where: { id: params.id } }),
  ]);

  await logAudit(
    session!.user.id,
    "DELETE_CUSTOM",
    "CustomContent",
    params.id,
    { modelId: existing.modelId }
  );

  return jsonSuccess({ deleted: true });
}

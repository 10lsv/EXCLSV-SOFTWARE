import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { createMessageSchema } from "@/lib/validations/custom";
import { createNotification, notifyAdmins, truncate } from "@/lib/notifications";

// POST /api/customs/[id]/messages — add message to custom thread
export async function POST(
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
  const parsed = createMessageSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message);
  }

  const role = session!.user.role as Role;
  const userId = session!.user.id;

  const custom = await prisma.customContent.findUnique({
    where: { id: params.id },
    include: { model: { select: { userId: true } } },
  });

  if (!custom) return jsonError("Custom introuvable", 404);

  // Data isolation checks
  if (role === Role.MODEL) {
    if (custom.model.userId !== userId) {
      return jsonError("Accès interdit", 403);
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
        modelId: custom.modelId,
        isActive: true,
      },
    });
    if (!assignment) return jsonError("Accès interdit", 403);
  }

  const message = await prisma.customMessage.create({
    data: {
      customId: params.id,
      senderId: userId,
      content: parsed.data.content,
    },
  });

  // Get sender info
  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, role: true },
  });

  await logAudit(
    userId,
    "SEND_CUSTOM_MESSAGE",
    "CustomMessage",
    message.id,
    { customId: params.id }
  );

  // ─── Notifications ───
  const senderName = sender?.name || "Inconnu";
  const msgPreview = truncate(parsed.data.content);

  if (role === Role.MODEL) {
    // Modèle envoie → notifier le chatter créateur
    const chatterProfile = await prisma.chatterProfile.findUnique({
      where: { id: custom.createdById },
      select: { userId: true },
    });
    if (chatterProfile) {
      await createNotification({
        userId: chatterProfile.userId,
        type: "CUSTOM_MESSAGE",
        title: "Nouveau message",
        message: `${senderName} : "${msgPreview}"`,
        link: `/chatter/customs/${params.id}`,
      });
    }
  } else if (role === Role.CHATTER) {
    // Chatter envoie → notifier la modèle
    await createNotification({
      userId: custom.model.userId,
      type: "CUSTOM_MESSAGE",
      title: "Nouveau message",
      message: `${senderName} : "${msgPreview}"`,
      link: `/model/customs/${params.id}`,
    });
  } else {
    // Admin envoie → notifier la modèle + le chatter
    await createNotification({
      userId: custom.model.userId,
      type: "CUSTOM_MESSAGE",
      title: "Nouveau message",
      message: `${senderName} : "${msgPreview}"`,
      link: `/model/customs/${params.id}`,
    });
    const chatterProfile = await prisma.chatterProfile.findUnique({
      where: { id: custom.createdById },
      select: { userId: true },
    });
    if (chatterProfile) {
      await createNotification({
        userId: chatterProfile.userId,
        type: "CUSTOM_MESSAGE",
        title: "Nouveau message",
        message: `${senderName} : "${msgPreview}"`,
        link: `/chatter/customs/${params.id}`,
      });
    }
  }

  // Notifier les admins (sauf si c'est un admin qui envoie)
  if (role !== Role.OWNER && role !== Role.ADMIN) {
    await notifyAdmins({
      type: "CUSTOM_MESSAGE",
      title: "Nouveau message",
      message: `${senderName} : "${msgPreview}"`,
      link: `/admin/customs/${params.id}`,
    });
  }

  return jsonSuccess({
    ...message,
    sender: sender || { name: "Inconnu", role: "UNKNOWN" },
  }, 201);
}

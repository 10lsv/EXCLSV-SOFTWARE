import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// GET /api/messages/unread-count — count conversations with unread messages
export async function GET(_req: NextRequest) {
  const { error, session } = await requireRole(
    Role.OWNER, Role.ADMIN, Role.CHATTER_MANAGER, Role.CHATTER, Role.MODEL
  );
  if (error) return error;

  const role = session!.user.role as Role;
  const userId = session!.user.id;

  const conditions: Prisma.CustomContentWhereInput[] = [
    { messages: { some: {} } },
  ];

  if (role === Role.CHATTER) {
    const cp = await prisma.chatterProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!cp) return jsonError("Profil chatter introuvable", 404);
    conditions.push({ createdById: cp.id });
  } else if (role === Role.MODEL) {
    const mp = await prisma.modelProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!mp) return jsonError("Profil modèle introuvable", 404);
    conditions.push({ modelId: mp.id });
  }

  const customs = await prisma.customContent.findMany({
    where: { AND: conditions },
    select: { id: true },
  });

  let unreadConversations = 0;
  for (const c of customs) {
    const unread = await prisma.customMessage.count({
      where: {
        customId: c.id,
        senderId: { not: userId },
        NOT: { readBy: { has: userId } },
      },
    });
    if (unread > 0) unreadConversations++;
  }

  return jsonSuccess({ count: unreadConversations });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// GET /api/messages/conversations — customs with messages, filtered by role
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
    const cp = await prisma.chatterProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!cp) return jsonError("Profil chatter introuvable", 404);
    conditions.push({ createdById: cp.id });
  } else if (role === Role.MODEL) {
    const mp = await prisma.modelProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!mp) return jsonError("Profil modèle introuvable", 404);
    conditions.push({ modelId: mp.id });
  }

  const customs = await prisma.customContent.findMany({
    where: { AND: conditions },
    include: {
      model: { select: { id: true, stageName: true, photoUrl: true } },
      createdBy: { include: { user: { select: { id: true, name: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { custom: { select: { id: true } } },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get sender names for last messages
  const senderIds = customs
    .filter((c) => c.messages.length > 0)
    .map((c) => c.messages[0].senderId);
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true },
  });
  const senderMap = new Map(senders.map((s) => [s.id, s.name]));

  // Fix any NULL readBy values (migration edge case)
  await prisma.$executeRawUnsafe(
    'UPDATE "CustomMessage" SET "readBy" = ARRAY[]::text[] WHERE "readBy" IS NULL'
  );

  // Count unread per conversation
  const result = await Promise.all(
    customs.map(async (c) => {
      const unreadCount = await prisma.customMessage.count({
        where: {
          customId: c.id,
          senderId: { not: userId },
          NOT: { readBy: { has: userId } },
        },
      });
      console.log("[MSG] Conversation", c.id, "unreadCount:", unreadCount);

      const lastMsg = c.messages[0] || null;

      return {
        customId: c.id,
        description: c.description,
        status: c.status,
        model: c.model,
        chatter: c.createdBy.user,
        totalMessages: c._count.messages,
        unreadCount,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              senderId: lastMsg.senderId,
              senderName: senderMap.get(lastMsg.senderId) || "Inconnu",
              createdAt: lastMsg.createdAt,
            }
          : null,
      };
    })
  );

  // Sort: unread first, then by last message date
  result.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    const aDate = a.lastMessage?.createdAt?.getTime() ?? 0;
    const bDate = b.lastMessage?.createdAt?.getTime() ?? 0;
    return bDate - aDate;
  });

  return jsonSuccess(result);
}

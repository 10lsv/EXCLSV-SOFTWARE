import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// PATCH /api/customs/[id]/messages/read — mark all messages as read by current user
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(
    Role.OWNER, Role.ADMIN, Role.CHATTER, Role.MODEL
  );
  if (error) return error;

  const userId = session!.user.id;

  const custom = await prisma.customContent.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!custom) return jsonError("Custom introuvable", 404);

  // Get unread messages not sent by this user
  const unread = await prisma.customMessage.findMany({
    where: {
      customId: params.id,
      senderId: { not: userId },
      NOT: { readBy: { has: userId } },
    },
    select: { id: true, readBy: true },
  });

  // Add userId to readBy
  for (const msg of unread) {
    await prisma.customMessage.update({
      where: { id: msg.id },
      data: { readBy: { push: userId } },
    });
  }

  return jsonSuccess({ marked: unread.length });
}

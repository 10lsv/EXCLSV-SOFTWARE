import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// PATCH /api/notifications/read-all — mark all notifications as read
export async function PATCH(req: NextRequest) {
  const { error, session } = await requireRole(
    Role.OWNER,
    Role.ADMIN,
    Role.CHATTER_MANAGER,
    Role.CHATTER,
    Role.MODEL
  );
  if (error) return error;

  await prisma.notification.updateMany({
    where: { userId: session!.user.id, isRead: false },
    data: { isRead: true },
  });

  return jsonSuccess({ success: true });
}

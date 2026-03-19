import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// DELETE /api/notifications/[id] — delete one notification
export async function DELETE(
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

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
  });

  if (!notification) return jsonError("Notification introuvable", 404);
  if (notification.userId !== session!.user.id) {
    return jsonError("Accès interdit", 403);
  }

  await prisma.notification.delete({ where: { id: params.id } });

  return jsonSuccess({ deleted: true });
}

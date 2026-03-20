import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// PATCH /api/notifications/[id]/dismiss — masquer du volet déroulant (ne supprime pas)
export async function PATCH(
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

  const updated = await prisma.notification.update({
    where: { id: params.id },
    data: { dismissedFromPopover: true },
  });

  return jsonSuccess(updated);
}

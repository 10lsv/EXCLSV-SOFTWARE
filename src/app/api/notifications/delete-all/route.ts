import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, requireRole } from "@/lib/api-utils";

// DELETE /api/notifications/delete-all — delete all notifications for current user
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_req: NextRequest) {
  const { error, session } = await requireRole(
    Role.OWNER,
    Role.ADMIN,
    Role.CHATTER_MANAGER,
    Role.CHATTER,
    Role.MODEL
  );
  if (error) return error;

  const result = await prisma.notification.deleteMany({
    where: { userId: session!.user.id },
  });

  return jsonSuccess({ deleted: result.count });
}

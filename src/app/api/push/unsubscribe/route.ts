import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// POST /api/push/unsubscribe — remove push subscription
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(
    Role.OWNER, Role.ADMIN, Role.CHATTER_MANAGER, Role.CHATTER, Role.MODEL
  );
  if (error) return error;

  const body = await req.json();
  const { endpoint } = body;

  if (!endpoint) return jsonError("endpoint requis", 400);

  await prisma.pushSubscription.deleteMany({
    where: { userId: session!.user.id, endpoint },
  });

  return jsonSuccess({ unsubscribed: true });
}

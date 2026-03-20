import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// POST /api/push/subscribe — register push subscription
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(
    Role.OWNER, Role.ADMIN, Role.CHATTER_MANAGER, Role.CHATTER, Role.MODEL
  );
  if (error) return error;

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return jsonError("endpoint et keys (p256dh, auth) requis", 400);
  }

  await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: {
        userId: session!.user.id,
        endpoint,
      },
    },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    create: {
      userId: session!.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return jsonSuccess({ subscribed: true }, 201);
}

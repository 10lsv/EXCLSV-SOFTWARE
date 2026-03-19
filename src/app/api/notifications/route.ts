import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// GET /api/notifications — list notifications for current user
export async function GET(req: NextRequest) {
  const { error, session } = await requireRole(
    Role.OWNER,
    Role.ADMIN,
    Role.CHATTER_MANAGER,
    Role.CHATTER,
    Role.MODEL
  );
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "0");
  const unreadOnly = searchParams.get("unread") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = limit || 20;
  const skip = limit ? 0 : (page - 1) * perPage;

  const userId = session!.user.id;

  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit || perPage,
      skip,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return jsonSuccess({ notifications, total, unreadCount, page, limit: limit || perPage });
}

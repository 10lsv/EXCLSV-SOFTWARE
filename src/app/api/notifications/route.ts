import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// GET /api/notifications — list notifications for current user
// ?source=popover → 5 dernières non-dismissées du volet
// ?source=center  → 30 derniers jours (paginé)
// (défaut)        → comportement legacy paginé
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
  const source = searchParams.get("source"); // "popover" | "center" | null
  const unreadOnly = searchParams.get("unread") === "true";
  const userId = session!.user.id;

  if (source === "popover") {
    // Volet déroulant : 5 dernières non lues + non dismissées
    const where = {
      userId,
      isRead: false,
      dismissedFromPopover: false,
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return jsonSuccess({ notifications, total: notifications.length, unreadCount, page: 1, limit: 5 });
  }

  if (source === "center") {
    // Centre de notifications : 30 derniers jours, paginé
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = 20;
    const skip = (page - 1) * perPage;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where = {
      userId,
      createdAt: { gte: thirtyDaysAgo },
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: perPage,
        skip,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false, createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return jsonSuccess({ notifications, total, unreadCount, page, limit: perPage });
  }

  // Comportement par défaut (legacy)
  const limit = parseInt(searchParams.get("limit") || "0");
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = limit || 20;
  const skip = limit ? 0 : (page - 1) * perPage;

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

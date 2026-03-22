import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// GET /api/chatters — list chatters with assignments, hours, and shift status
export async function GET(_req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    // Get week boundaries (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const chatters = await prisma.chatterProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, createdAt: true } },
        assignments: {
          where: { isActive: true },
          include: { model: { select: { id: true, stageName: true, photoUrl: true } } },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    // Fetch clock records for the week and today's shifts for all chatters
    const chatterUserIds = chatters.map((c) => c.user.id);

    const [weekClocks, todayShifts, todayClocks] = await Promise.all([
      prisma.clockRecord.findMany({
        where: {
          chatterId: { in: chatterUserIds },
          shiftDate: { gte: weekStart, lte: weekEnd },
          clockOut: { not: null },
        },
        select: { chatterId: true, clockIn: true, clockOut: true },
      }),
      prisma.shiftSchedule.findMany({
        where: {
          chatterId: { in: chatterUserIds },
          shiftDate: today,
        },
        select: { chatterId: true },
      }),
      prisma.clockRecord.findMany({
        where: {
          chatterId: { in: chatterUserIds },
          shiftDate: today,
          clockOut: null,
        },
        select: { chatterId: true },
      }),
    ]);

    // Build maps
    const weekHoursMap = new Map<string, number>();
    for (const c of weekClocks) {
      if (!c.clockOut) continue;
      const mins = (c.clockOut.getTime() - c.clockIn.getTime()) / 60000;
      weekHoursMap.set(c.chatterId, (weekHoursMap.get(c.chatterId) || 0) + mins);
    }

    const hasShiftToday = new Set(todayShifts.map((s) => s.chatterId));
    const isClockedIn = new Set(todayClocks.map((c) => c.chatterId));

    const result = chatters.map((c) => {
      const userId = c.user.id;
      const weekMinutes = weekHoursMap.get(userId) || 0;
      const weekHours = Math.round((weekMinutes / 60) * 100) / 100;

      let status: "online" | "not_clocked" | "off_shift" = "off_shift";
      if (hasShiftToday.has(userId) && isClockedIn.has(userId)) {
        status = "online";
      } else if (hasShiftToday.has(userId)) {
        status = "not_clocked";
      }

      return {
        ...c,
        weekHours,
        status,
      };
    });

    // KPIs
    const totalChatters = chatters.length;
    const onlineCount = result.filter((c) => c.status === "online").length;
    const totalWeekHours = Math.round(result.reduce((s, c) => s + c.weekHours, 0) * 100) / 100;

    return jsonSuccess({
      chatters: result,
      kpis: { totalChatters, onlineCount, totalWeekHours },
    });
  } catch (err: unknown) {
    console.error("[CHATTERS GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

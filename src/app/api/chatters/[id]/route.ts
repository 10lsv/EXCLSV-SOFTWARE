import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// GET /api/chatters/[id] — detail of a chatter (by userId)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const profile = await prisma.chatterProfile.findUnique({
      where: { userId: id },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, createdAt: true } },
        assignments: {
          where: { isActive: true },
          include: { model: { select: { id: true, stageName: true, photoUrl: true } } },
        },
      },
    });

    if (!profile) return jsonError("Chatter introuvable", 404);

    // Clock records for week and month
    const [weekClocks, monthClocks, recentClocks, monthDaily] = await Promise.all([
      prisma.clockRecord.findMany({
        where: { chatterId: id, shiftDate: { gte: weekStart, lte: weekEnd }, clockOut: { not: null } },
        select: { clockIn: true, clockOut: true },
      }),
      prisma.clockRecord.findMany({
        where: { chatterId: id, shiftDate: { gte: monthStart, lte: monthEnd }, clockOut: { not: null } },
        select: { clockIn: true, clockOut: true },
      }),
      prisma.clockRecord.findMany({
        where: { chatterId: id },
        orderBy: { shiftDate: "desc" },
        take: 14,
        select: {
          id: true, shiftDate: true, shiftType: true,
          clockIn: true, clockOut: true, source: true,
        },
      }),
      prisma.chatterDailyData.findMany({
        where: { chatterId: id, date: { gte: monthStart, lte: monthEnd } },
        include: { model: { select: { stageName: true } } },
      }),
    ]);

    const weekHours = Math.round(weekClocks.reduce((s, c) => {
      if (!c.clockOut) return s;
      return s + (c.clockOut.getTime() - c.clockIn.getTime()) / 60000;
    }, 0) / 60 * 100) / 100;

    const monthHours = Math.round(monthClocks.reduce((s, c) => {
      if (!c.clockOut) return s;
      return s + (c.clockOut.getTime() - c.clockIn.getTime()) / 60000;
    }, 0) / 60 * 100) / 100;

    const monthTipsMessages = Math.round(
      monthDaily.reduce((s, d) => s + d.tipsGross + d.messagesGross, 0) * 100
    ) / 100;

    const monthCommission = Math.round(
      monthTipsMessages * (profile.commissionRate / 100) * 100
    ) / 100;

    return jsonSuccess({
      ...profile,
      stats: { weekHours, monthHours, monthTipsMessages, monthCommission },
      recentClocks,
    });
  } catch (err: unknown) {
    console.error("[CHATTER GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// PATCH /api/chatters/[id] — update chatter profile (by userId)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.hourlyRate !== undefined) data.hourlyRate = parseFloat(String(body.hourlyRate));
    if (body.commissionRate !== undefined) data.commissionRate = parseFloat(String(body.commissionRate));

    const updated = await prisma.chatterProfile.update({
      where: { userId: id },
      data,
    });

    await logAudit(session!.user.id, "UPDATE_CHATTER_PROFILE", "ChatterProfile", updated.id, data);

    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[CHATTER PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

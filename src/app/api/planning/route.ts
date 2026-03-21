import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// GET /api/planning — shifts for a week
export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const weekStart = req.nextUrl.searchParams.get("weekStart");
    const chatterId = req.nextUrl.searchParams.get("chatterId");

    if (!weekStart) return jsonError("weekStart requis");

    const start = new Date(weekStart);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);

    const where: Record<string, unknown> = {
      shiftDate: { gte: start, lt: end },
    };
    if (chatterId) where.chatterId = chatterId;

    const shifts = await prisma.shiftSchedule.findMany({
      where,
      include: {
        chatter: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ shiftDate: "asc" }, { shiftType: "asc" }],
    });

    // Also fetch clock records for this week
    const clocks = await prisma.clockRecord.findMany({
      where: { shiftDate: { gte: start, lt: end } },
      orderBy: { shiftDate: "asc" },
    });

    return jsonSuccess({ shifts, clocks, weekStart: start.toISOString() });
  } catch (err: unknown) {
    console.error("[PLANNING GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// POST /api/planning — assign a shift
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const { chatterId, shiftDate, shiftType, note } = body;

    if (!chatterId || !shiftDate || !shiftType) {
      return jsonError("chatterId, shiftDate et shiftType requis");
    }

    const dateObj = new Date(shiftDate);
    const normalizedDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));

    const shift = await prisma.shiftSchedule.create({
      data: {
        chatterId,
        shiftDate: normalizedDate,
        shiftType,
        note: note || null,
      },
      include: {
        chatter: { select: { id: true, name: true, avatar: true } },
      },
    });

    await logAudit(session!.user.id, "CREATE_SHIFT", "ShiftSchedule", shift.id, { chatterId, shiftDate, shiftType });

    return jsonSuccess(shift, 201);
  } catch (err: unknown) {
    console.error("[PLANNING POST]", err);
    const msg = err instanceof Error ? err.message : "Erreur interne";
    if (msg.includes("Unique constraint")) return jsonError("Ce chatter a déjà un shift ce jour", 409);
    return jsonError(msg, 500);
  }
}

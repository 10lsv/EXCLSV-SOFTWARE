import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// GET /api/clock/records — list clock records
export async function GET(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN, Role.CHATTER);
  if (error) return error;

  try {
    const weekStart = req.nextUrl.searchParams.get("weekStart");
    const chatterId = req.nextUrl.searchParams.get("chatterId");
    const role = session!.user.role as Role;

    const where: Record<string, unknown> = {};

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      where.shiftDate = { gte: start, lt: end };
    }

    if (role === Role.CHATTER) {
      where.chatterId = session!.user.id;
    } else if (chatterId) {
      where.chatterId = chatterId;
    }

    const records = await prisma.clockRecord.findMany({
      where,
      include: { chatter: { select: { id: true, name: true, avatar: true } } },
      orderBy: { shiftDate: "desc" },
    });

    return jsonSuccess(records);
  } catch (err: unknown) {
    console.error("[CLOCK RECORDS GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// POST /api/clock/records — admin manual add
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const { chatterId, shiftDate, shiftType, clockIn, clockOut } = body;

    if (!chatterId || !shiftDate || !shiftType || !clockIn) {
      return jsonError("chatterId, shiftDate, shiftType et clockIn requis");
    }

    const dateObj = new Date(shiftDate);
    const normalizedDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));

    const record = await prisma.clockRecord.create({
      data: {
        chatterId,
        shiftDate: normalizedDate,
        shiftType,
        clockIn: new Date(clockIn),
        clockOut: clockOut ? new Date(clockOut) : null,
        source: "MANUAL",
      },
    });

    await logAudit(session!.user.id, "CREATE_CLOCK_RECORD", "ClockRecord", record.id, { chatterId, shiftDate });

    return jsonSuccess(record, 201);
  } catch (err: unknown) {
    console.error("[CLOCK RECORDS POST]", err);
    const msg = err instanceof Error ? err.message : "Erreur interne";
    if (msg.includes("Unique constraint")) return jsonError("Un pointage existe déjà pour ce chatter ce jour", 409);
    return jsonError(msg, 500);
  }
}
